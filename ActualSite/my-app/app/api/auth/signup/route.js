import { NextResponse } from "next/server";
import { withDb } from "@/lib/mongodb";
import { hashPassword } from "@/lib/password";
import { createCode, CodeCooldownError } from "@/lib/authCodes";
import { sendCodeEmail, EmailError } from "@/lib/email";
import { cleanName, jsonError, normalizeEmail, passwordProblem, readJson, rejectCrossSite, serverErrorResponse } from "@/lib/authHelpers";

// POST /api/auth/signup  { name, email, password }
// Step 1 of creating an account: emails a 6-digit code to the address.
// The account is only created once the code is entered (/api/auth/verify),
// so nobody can claim an email address they don't own.
export async function POST(request) {
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;

  const body = (await readJson(request)) || {};
  const name = cleanName(body.name);
  if (!name) return jsonError("Enter your name.");
  const email = normalizeEmail(body.email);
  if (!email) return jsonError("Enter a valid email address.");
  const problem = passwordProblem(body.password);
  if (problem) return jsonError(problem);

  try {
    const result = await withDb(async (db) => {
      const existing = await db.collection("users").findOne({ email }, { projection: { passwordHash: 1 } });
      if (existing && existing.passwordHash) return { exists: true };
      // Accounts made with "Continue with Google" have no password yet; signing
      // up with the same email adds one to that account once the code is entered.
      const passwordHash = await hashPassword(body.password);
      const code = await createCode(db, { email, purpose: "signup", data: { name, passwordHash } });
      return { code };
    });
    if (result.exists) {
      return jsonError("There's already an account with this email. Sign in, or use “Forgot password” to reset it.", 409);
    }
    await sendCodeEmail({ to: email, code: result.code, purpose: "signup" });
    return NextResponse.json({ ok: true, email });
  } catch (error) {
    if (error instanceof CodeCooldownError) return jsonError(error.message, 429);
    if (error instanceof EmailError) return jsonError(error.message, 502);
    return serverErrorResponse(error, "create your account");
  }
}
