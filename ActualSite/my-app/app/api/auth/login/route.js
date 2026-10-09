import { withDb } from "@/lib/mongodb";
import { fakeVerify, hashPassword, verifyPassword } from "@/lib/password";
import { jsonError, normalizeEmail, readJson, rejectCrossSite, signedInResponse, serverErrorResponse } from "@/lib/authHelpers";

// POST /api/auth/login  { email, password, returnTo }
// After 5 wrong passwords in a row an account is locked for 15 minutes, to
// stop password guessing.

const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;
const WRONG = "That email and password don't match.";

export async function POST(request) {
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;

  const body = (await readJson(request)) || {};
  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) return jsonError("Enter your email and password.");

  try {
    const result = await withDb(async (db) => {
      const users = db.collection("users");
      const user = await users.findOne({ email });
      const now = new Date();

      if (!user || !user.passwordHash) {
        await fakeVerify(password);
        return { error: WRONG, status: 401 };
      }
      if (user.lockedUntil && user.lockedUntil > now) {
        const minutes = Math.ceil((user.lockedUntil - now) / 60000);
        return {
          error: `Too many wrong passwords. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}, or reset your password.`,
          status: 429,
        };
      }

      const { ok, needsRehash } = await verifyPassword(password, user.passwordHash);
      if (!ok) {
        const failures = (user.loginFailures || 0) + 1;
        if (failures >= MAX_FAILURES) {
          await users.updateOne(
            { _id: user._id },
            { $set: { loginFailures: 0, lockedUntil: new Date(now.getTime() + LOCK_MINUTES * 60000) } }
          );
        } else {
          await users.updateOne({ _id: user._id }, { $set: { loginFailures: failures } });
        }
        return { error: WRONG, status: 401 };
      }

      const update = { $set: { loginFailures: 0, lastLoginAt: now }, $unset: { lockedUntil: "" } };
      if (needsRehash) update.$set.passwordHash = await hashPassword(password);
      await users.updateOne({ _id: user._id }, update);
      return { user };
    });

    if (result.error) return jsonError(result.error, result.status);
    return signedInResponse(result.user, body.returnTo);
  } catch (error) {
    return serverErrorResponse(error, "sign you in");
  }
}
