// Password hashing for email + password accounts. Uses the Web Crypto API,
// which runs natively on Cloudflare Workers.
//
// How a password is stored:
//   1. HMAC-SHA256 it with PASSWORD_PEPPER, a secret that lives only in
//      Cloudflare's secret store, never in the database. If the database
//      ever leaked, the hashes are useless without the pepper.
//   2. Run that through PBKDF2-SHA256 with a random salt.
//   3. Save "pbkdf2-sha256$<iterations>$<salt>$<hash>".
//
// ITERATIONS is lower than the usual recommendation (600,000) so a login
// fits in the Workers Free plan's 10 ms CPU limit. The pepper makes up for
// much of that. If the club moves to Workers Paid, raise ITERATIONS (up to
// 100,000, the most Workers allows): each member's hash is upgraded
// automatically the next time they sign in.
//
// Never change or lose PASSWORD_PEPPER. Every existing password stops
// working, and members would have to use "Forgot password".
//
// Server-only.

const ITERATIONS = 30000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

const encoder = new TextEncoder();

function toBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(text) {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function pepper() {
  const value = process.env.PASSWORD_PEPPER;
  if (!value || value.length < 32) {
    throw new Error("PASSWORD_PEPPER must be set to a random string of at least 32 characters.");
  }
  return value;
}

async function peppered(password) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(pepper()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(password)));
}

async function derive(password, salt, iterations) {
  const material = await crypto.subtle.importKey("raw", await peppered(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, material, HASH_BITS);
  return new Uint8Array(bits);
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, ITERATIONS);
  return `pbkdf2-sha256$${ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

// Returns { ok, needsRehash }. needsRehash = stored with an older setting.
export async function verifyPassword(password, stored) {
  const parts = typeof stored === "string" ? stored.split("$") : [];
  if (parts.length !== 4 || parts[0] !== "pbkdf2-sha256") return { ok: false, needsRehash: false };
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 1) return { ok: false, needsRehash: false };
  const hash = await derive(password, fromBase64(parts[2]), iterations);
  const ok = constantTimeEqual(hash, fromBase64(parts[3]));
  return { ok, needsRehash: ok && iterations !== ITERATIONS };
}

// Spends the same time as a real check, so "no such account" and "wrong
// password" can't be told apart by timing.
export async function fakeVerify(password) {
  await derive(password, new Uint8Array(SALT_BYTES), ITERATIONS);
}
