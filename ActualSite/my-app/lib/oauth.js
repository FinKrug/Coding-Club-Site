// Small helpers for the Google sign-in flow (app/api/auth/*). Uses the Web
// Crypto API, which exists both in Node and on Cloudflare Workers.

export const OAUTH_COOKIE = "ncc_oauth";

function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomToken(byteLength = 32) {
  return base64url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

// PKCE: we send Google a hash of a random secret now, and the secret itself
// when trading the code for tokens, so a stolen code is useless on its own.
export async function pkceChallenge(verifier) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  return base64url(new Uint8Array(digest));
}

// Public origin of the site. Normally taken from the request; set SITE_URL
// to override it if that ever comes out wrong behind a proxy.
export function siteOrigin(request) {
  return (process.env.SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
}

export function googleRedirectUri(request) {
  return `${siteOrigin(request)}/api/auth/callback/google`;
}

// Only allow redirecting back to a path on this site, never to another
// domain ("//evil.com" or "/\evil.com" would be treated as one by browsers).
export function safeReturnTo(value) {
  if (typeof value !== "string" || !value.startsWith("/")) return "/";
  if (value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}

// ALLOWED_EMAIL_DOMAINS="student.neumont.edu,neumont.edu" limits sign-in to
// those email domains. Leave it empty to allow any Google account.
export function allowedEmailDomains() {
  return (process.env.ALLOWED_EMAIL_DOMAINS || "")
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);
}

export function oauthCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // must survive the redirect back from Google
    path: "/api/auth",
    maxAge: 60 * 10, // the sign-in round trip has 10 minutes to finish
  };
}
