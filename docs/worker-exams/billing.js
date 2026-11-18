/**
 * Premium billing endpoints for the Worker (Stripe). Copy into src/.
 *
 *   POST /api/billing/checkout  { plan: "monthly"|"yearly", returnUrl }  → { url }
 *   POST /api/billing/portal    { returnUrl }                             → { url }
 *   POST /api/billing/webhook   (called by Stripe, signed)                → 200
 *
 * Secrets / vars:
 *   STRIPE_SECRET_KEY        sk_test_… first, sk_live_… when going live
 *   STRIPE_WEBHOOK_SECRET    whsec_… from the webhook endpoint in Stripe
 *   STRIPE_PRICE_MONTHLY     price_… (recurring, monthly)
 *   STRIPE_PRICE_YEARLY      price_… (recurring, yearly)
 *   ALLOWED_RETURN_ORIGINS   "https://wordaround-site.pages.dev,http://localhost:5173"
 *   FIREBASE_PROJECT_ID      "wordaround-97f86"
 *   FIREBASE_SERVICE_ACCOUNT (see firestoreAdmin.js)
 */

import { userFromRequest } from "./firebaseAuth.js";
import { readEntitlement, writeEntitlement } from "./firestoreAdmin.js";

const STRIPE_API = "https://api.stripe.com/v1";

async function stripe(env, method, path, params) {
  const response = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params ? new URLSearchParams(params) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `stripe_${response.status}`);
  return data;
}

/** Only send people back to our own site — never to a URL a request made up. */
function safeReturnUrl(env, returnUrl) {
  try {
    const url = new URL(returnUrl);
    const allowed = String(env.ALLOWED_RETURN_ORIGINS || "").split(",").map((s) => s.trim());
    return allowed.includes(url.origin) ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function handleCheckout(request, env, json) {
  const user = await userFromRequest(request, env);
  if (!user) return json({ error: "Sign in again to continue." }, 401);
  const body = await request.json().catch(() => ({}));
  const price = body.plan === "monthly" ? env.STRIPE_PRICE_MONTHLY : body.plan === "yearly" ? env.STRIPE_PRICE_YEARLY : null;
  const returnUrl = safeReturnUrl(env, body.returnUrl);
  if (!price || !returnUrl) return json({ error: "Invalid plan or return address." }, 400);

  const existing = await readEntitlement(env, user.uid).catch(() => null);
  const params = {
    mode: "subscription",
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
    success_url: `${returnUrl}?checkout=success`,
    cancel_url: returnUrl,
    client_reference_id: user.uid,
    "subscription_data[metadata][uid]": user.uid,
    allow_promotion_codes: "true",
  };
  if (existing?.stripeCustomerId) params.customer = existing.stripeCustomerId;
  else if (user.email) params.customer_email = user.email;

  const session = await stripe(env, "POST", "/checkout/sessions", params);
  return json({ url: session.url }, 200);
}

export async function handlePortal(request, env, json) {
  const user = await userFromRequest(request, env);
  if (!user) return json({ error: "Sign in again to continue." }, 401);
  const body = await request.json().catch(() => ({}));
  const returnUrl = safeReturnUrl(env, body.returnUrl);
  if (!returnUrl) return json({ error: "Invalid return address." }, 400);
  const entitlement = await readEntitlement(env, user.uid);
  if (!entitlement?.stripeCustomerId) return json({ error: "No subscription found." }, 404);
  const session = await stripe(env, "POST", "/billing_portal/sessions", {
    customer: entitlement.stripeCustomerId,
    return_url: returnUrl,
  });
  return json({ url: session.url }, 200);
}

/* Stripe-Signature: t=…,v1=… ; v1 = HMAC-SHA256(secret, `${t}.${rawBody}`). */
async function verifyStripeSignature(rawBody, header, secret) {
  const parts = Object.fromEntries(
    String(header || "")
      .split(",")
      .map((kv) => kv.split("="))
      .filter((kv) => kv.length === 2),
  );
  const timestamp = Number(parts.t);
  if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > 300) return false;
  const signatures = String(header)
    .split(",")
    .filter((kv) => kv.startsWith("v1="))
    .map((kv) => kv.slice(3));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${parts.t}.${rawBody}`));
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return signatures.some((s) => s.length === expected.length && timingSafeEqual(s, expected));
}

function timingSafeEqual(a, b) {
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const ACTIVE = new Set(["active", "trialing"]);

/* Newer Stripe API versions moved current_period_end onto the items. */
const periodEnd = (subscription) =>
  (subscription.current_period_end ?? subscription.items?.data?.[0]?.current_period_end ?? 0) * 1000 || null;

async function applySubscription(env, subscription) {
  const uid = subscription.metadata?.uid;
  if (!uid) return;
  await writeEntitlement(env, uid, {
    premium: ACTIVE.has(subscription.status),
    status: subscription.status,
    currentPeriodEnd: periodEnd(subscription),
    stripeCustomerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id,
  });
}

export async function handleWebhook(request, env, json) {
  const rawBody = await request.text();
  const ok = await verifyStripeSignature(rawBody, request.headers.get("Stripe-Signature"), env.STRIPE_WEBHOOK_SECRET);
  if (!ok) return json({ error: "Bad signature." }, 400);
  const event = JSON.parse(rawBody);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.subscription) {
        const subscription = await stripe(env, "GET", `/subscriptions/${session.subscription}`);
        if (!subscription.metadata?.uid && session.client_reference_id) {
          subscription.metadata = { ...subscription.metadata, uid: session.client_reference_id };
        }
        await applySubscription(env, subscription);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await applySubscription(env, event.data.object);
      break;
    default:
      break;
  }
  return json({ received: true }, 200);
}
