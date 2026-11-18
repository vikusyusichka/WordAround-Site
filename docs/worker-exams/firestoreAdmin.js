/**
 * Minimal server-side Firestore access for the Worker: reading and writing
 * entitlements/{uid}. Uses a Google service account (Admin access, which
 * bypasses the security rules — that is why the browser can never write this
 * document itself). Copy into the Worker's src/ folder.
 *
 * Secret: FIREBASE_SERVICE_ACCOUNT = the whole service-account JSON file
 * (Firebase console → Project settings → Service accounts → Generate key).
 */

let tokenCache = { token: null, until: 0 };

function pemToPkcs8(pem) {
  const body = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  return Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
}

function base64Url(input) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function accessToken(env) {
  if (tokenCache.token && Date.now() < tokenCache.until) return tokenCache.token;
  const account = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(
    JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/datastore",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(account.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claims}`));
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${base64Url(signature)}`,
    }),
  });
  if (!response.ok) throw new Error(`google_token_${response.status}`);
  const data = await response.json();
  tokenCache = { token: data.access_token, until: Date.now() + (data.expires_in - 120) * 1000 };
  return tokenCache.token;
}

const docUrl = (env, uid) =>
  `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/entitlements/${encodeURIComponent(uid)}`;

/** { premium, currentPeriodEnd (ms|null), stripeCustomerId } or null. */
export async function readEntitlement(env, uid) {
  const response = await fetch(docUrl(env, uid), {
    headers: { Authorization: `Bearer ${await accessToken(env)}` },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`firestore_read_${response.status}`);
  const { fields = {} } = await response.json();
  return {
    premium: fields.premium?.booleanValue === true,
    currentPeriodEnd: fields.currentPeriodEnd?.timestampValue ? Date.parse(fields.currentPeriodEnd.timestampValue) : null,
    stripeCustomerId: fields.stripeCustomerId?.stringValue || null,
  };
}

/** Writes (merges) the entitlement fields for `uid`. */
export async function writeEntitlement(env, uid, { premium, currentPeriodEnd, stripeCustomerId, status }) {
  const fields = {
    premium: { booleanValue: !!premium },
    status: { stringValue: status || "" },
    updatedAt: { timestampValue: new Date().toISOString() },
  };
  if (currentPeriodEnd) fields.currentPeriodEnd = { timestampValue: new Date(currentPeriodEnd).toISOString() };
  if (stripeCustomerId) fields.stripeCustomerId = { stringValue: stripeCustomerId };
  const mask = Object.keys(fields).map((f) => `updateMask.fieldPaths=${f}`).join("&");
  const response = await fetch(`${docUrl(env, uid)}?${mask}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${await accessToken(env)}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
  if (!response.ok) throw new Error(`firestore_write_${response.status}`);
}

export async function isPremium(env, uid) {
  try {
    const e = await readEntitlement(env, uid);
    return !!e?.premium && (e.currentPeriodEnd === null || e.currentPeriodEnd > Date.now());
  } catch {
    return false;
  }
}
