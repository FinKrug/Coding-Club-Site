import { withDb } from "@/lib/mongodb";
import { redeemCode, CODE_ERRORS } from "@/lib/authCodes";
import { jsonError, normalizeEmail, readJson, rejectCrossSite, signedInResponse } from "@/lib/authHelpers";

// POST /api/auth/verify  { email, code, returnTo }
// Step 2 of creating an account: checks the emailed code, creates the
// account (or adds the password to an existing Google account with the same
// email) and signs the member in.
export async function POST(request) {
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;

  const body = (await readJson(request)) || {};
  const email = normalizeEmail(body.email);
  if (!email) return jsonError("Enter a valid email address.");

  try {
    const result = await withDb(async (db) => {
      const check = await redeemCode(db, { email, purpose: "signup", code: body.code });
      if (!check.ok) return { error: CODE_ERRORS[check.reason] };

      const users = db.collection("users");
      const now = new Date();
      const { name, passwordHash } = check.data;

      const existing = await users.findOne({ email });
      if (existing) {
        if (existing.passwordHash) return { error: "There's already an account with this email. Sign in instead." };
        await users.updateOne(
          { _id: existing._id },
          { $set: { passwordHash, emailVerified: true, lastLoginAt: now } }
        );
        return { user: existing };
      }

      const doc = {
        email,
        emailVerified: true,
        name,
        image: null,
        passwordHash,
        points: 0,
        role: "member",
        createdAt: now,
        lastLoginAt: now,
      };
      try {
        const { insertedId } = await users.insertOne(doc);
        return { user: { ...doc, _id: insertedId } };
      } catch (error) {
        if (error.code === 11000) return { error: "There's already an account with this email. Sign in instead." };
        throw error;
      }
    });

    if (result.error) return jsonError(result.error);
    return signedInResponse(result.user, body.returnTo);
  } catch (error) {
    console.error("Verification failed:", error);
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
