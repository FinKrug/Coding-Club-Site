import { withDb } from "@/lib/mongodb";
import { hashPassword } from "@/lib/password";
import { redeemCode, CODE_ERRORS } from "@/lib/authCodes";
import { jsonError, normalizeEmail, passwordProblem, readJson, rejectCrossSite, signedInResponse, serverErrorResponse } from "@/lib/authHelpers";

// POST /api/auth/reset  { email, code, password, returnTo }
// Sets a new password using the code from /api/auth/forgot, then signs in.
export async function POST(request) {
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;

  const body = (await readJson(request)) || {};
  const email = normalizeEmail(body.email);
  if (!email) return jsonError("Enter a valid email address.");
  // Check the new password first so a typo doesn't use up the code.
  const problem = passwordProblem(body.password);
  if (problem) return jsonError(problem);

  try {
    const result = await withDb(async (db) => {
      const check = await redeemCode(db, { email, purpose: "reset", code: body.code });
      if (!check.ok) return { error: CODE_ERRORS[check.reason] };
      const users = db.collection("users");
      const user = await users.findOne({ email });
      if (!user) return { error: CODE_ERRORS.missing };
      await users.updateOne(
        { _id: user._id },
        {
          $set: { passwordHash: await hashPassword(body.password), emailVerified: true, loginFailures: 0, lastLoginAt: new Date() },
          $unset: { lockedUntil: "" },
        }
      );
      return { user };
    });
    if (result.error) return jsonError(result.error);
    return signedInResponse(result.user, body.returnTo);
  } catch (error) {
    return serverErrorResponse(error, "reset your password");
  }
}
