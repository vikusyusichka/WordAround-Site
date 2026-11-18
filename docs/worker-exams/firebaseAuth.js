/**
 * Verifies a Firebase ID token inside the Cloudflare Worker — no SDK, just
 * WebCrypto. Copy into the Worker's src/ folder (see docs/EXAMS-SETUP.md).
 *
 * The browser sends `Authorization: Bearer <idToken>` (VITE_AI_SEND_ID_TOKEN=on).
 * A token is accepted only if Google signed it for THIS Firebase project and
 * it has not expired, so a request cannot pretend to be another user.
 */

const JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

let keyCache = { keys: null, until: 0 };

async function signingKeys() {
  if (keyCache.keys && Date.now() < keyCache.until) return keyCache.keys;
  const response = await fetch(JWKS_URL);
  if (!response.ok) throw new Error("cannot_fetch_keys");
  const maxAge = Number(/max-age=(\d+)/.exec(response.headers.get("cache-control") || "")?.[1] || 3600);
  const { keys } = await response.json();
  keyCache = { keys, until: Date.now() + maxAge * 1000 };
  return keys;
}

function base64UrlBytes(segment) {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(segment.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

function base64UrlJson(segment) {
  return JSON.parse(new TextDecoder().decode(base64UrlBytes(segment)));
}

/**
 * Returns { uid, email } for a valid token, or throws.
 * @param {string} token
 * @param {string} projectId  e.g. "wordaround-97f86"
 */
export async function verifyFirebaseToken(token, projectId) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw new Error("malformed_token");
  const [headerPart, payloadPart, signaturePart] = parts;
  const header = base64UrlJson(headerPart);
  const payload = base64UrlJson(payloadPart);
  if (header.alg !== "RS256") throw new Error("bad_algorithm");

  const jwk = (await signingKeys()).find((k) => k.kid === header.kid);
  if (!jwk) throw new Error("unknown_key");
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    base64UrlBytes(signaturePart),
    new TextEncoder().encode(`${headerPart}.${payloadPart}`),
  );
  if (!valid) throw new Error("bad_signature");

  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== projectId) throw new Error("wrong_audience");
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error("wrong_issuer");
  if (typeof payload.exp !== "number" || payload.exp <= now) throw new Error("expired");
  if (typeof payload.iat !== "number" || payload.iat > now + 60) throw new Error("issued_in_future");
  if (typeof payload.sub !== "string" || payload.sub.length === 0) throw new Error("no_subject");

  return { uid: payload.sub, email: typeof payload.email === "string" ? payload.email : "" };
}

/** Reads and verifies the Bearer token of a request; null when absent or invalid. */
export async function userFromRequest(request, env) {
  const header = request.headers.get("Authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return null;
  try {
    return await verifyFirebaseToken(match[1], env.FIREBASE_PROJECT_ID);
  } catch {
    return null;
  }
}
