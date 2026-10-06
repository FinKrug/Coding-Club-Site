// One-time 6-digit codes emailed to members, for confirming an email
// address at sign-up ("signup") and for resetting a password ("reset").
//
// Stored in the `authCodes` collection, one per email + purpose. Only a
// keyed hash of the code is saved. Codes expire after 15 minutes (MongoDB
// deletes them automatically via a TTL index; see scripts/setup-db.mjs),
// allow 5 guesses, and can be re-sent at most once a minute.
//
// Server-only.

const CODE_LIFETIME_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

const encoder = new TextEncoder();

async function hashCode(email, purpose, code) {
  const secret = process.env.SESSION_SECRET || "";
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`${purpose}:${email}:${code}`));
  return Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, "0")).join("");
}

function randomCode() {
  const value = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return String(value).padStart(6, "0");
}

export class CodeCooldownError extends Error {
  constructor(secondsLeft) {
    super(`Please wait ${secondsLeft} seconds before asking for another code.`);
    this.secondsLeft = secondsLeft;
  }
}

// Makes a new code (replacing any earlier one) and returns it so the caller
// can email it. `data` is extra info to keep until the code is used, such as
// the sign-up's name and password hash.
export async function createCode(db, { email, purpose, data = {} }) {
  const codes = db.collection("authCodes");
  const existing = await codes.findOne({ email, purpose });
  if (existing && existing.sentAt && Date.now() - existing.sentAt.getTime() < RESEND_COOLDOWN_MS) {
    throw new CodeCooldownError(Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - existing.sentAt.getTime())) / 1000));
  }
  const code = randomCode();
  const now = new Date();
  await codes.replaceOne(
    { email, purpose },
    {
      email,
      purpose,
      codeHash: await hashCode(email, purpose, code),
      data,
      attempts: 0,
      sentAt: now,
      expiresAt: new Date(now.getTime() + CODE_LIFETIME_MS),
    },
    { upsert: true }
  );
  return code;
}

// Checks a code. On success the code is used up and its `data` returned.
// Returns { ok: true, data } or { ok: false, reason: "missing" | "expired" | "wrong" | "too-many" }.
export async function redeemCode(db, { email, purpose, code }) {
  const codes = db.collection("authCodes");
  const record = await codes.findOne({ email, purpose });
  if (!record) return { ok: false, reason: "missing" };
  if (record.expiresAt.getTime() < Date.now()) {
    await codes.deleteOne({ _id: record._id });
    return { ok: false, reason: "expired" };
  }
  if (record.attempts >= MAX_ATTEMPTS) return { ok: false, reason: "too-many" };

  const cleaned = String(code || "").replace(/\s+/g, "");
  if ((await hashCode(email, purpose, cleaned)) !== record.codeHash) {
    await codes.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
    return { ok: false, reason: record.attempts + 1 >= MAX_ATTEMPTS ? "too-many" : "wrong" };
  }

  // Delete first so a code can only ever be used once.
  const deleted = await codes.deleteOne({ _id: record._id });
  if (deleted.deletedCount !== 1) return { ok: false, reason: "missing" };
  return { ok: true, data: record.data || {} };
}

export const CODE_ERRORS = {
  missing: "That code isn't valid anymore. Ask for a new one.",
  expired: "That code has expired. Ask for a new one.",
  wrong: "That code isn't right. Check the email and try again.",
  "too-many": "Too many wrong tries. Ask for a new code.",
};
