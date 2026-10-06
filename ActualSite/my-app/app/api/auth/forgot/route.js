import { NextResponse } from "next/server";
import { withDb } from "@/lib/mongodb";
import { createCode, CodeCooldownError } from "@/lib/authCodes";
import { sendCodeEmail, EmailError } from "@/lib/email";
import { jsonError, normalizeEmail, readJson, rejectCrossSite } from "@/lib/authHelpers";

// POST /api/auth/forgot  { email }
// Emails a password-reset code if there's an account with that email. It
// gives the same answer either way, so it can't be used to check whether
// someone has an account. Also how Google-only accounts add a password.
export async function POST(request) {
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;

  const body = (await readJson(request)) || {};
  const email = normalizeEmail(body.email);
  if (!email) return jsonError("Enter a valid email address.");

  try {
    const code = await withDb(async (db) => {
      const user = await db.collection("users").findOne({ email }, { projection: { _id: 1 } });
      if (!user) return null;
      return createCode(db, { email, purpose: "reset" });
    });
    if (code) await sendCodeEmail({ to: email, code, purpose: "reset" });
  } catch (error) {
    if (error instanceof CodeCooldownError) return jsonError(error.message, 429);
    if (error instanceof EmailError) return jsonError(error.message, 502);
    console.error("Forgot password failed:", error);
    return jsonError("Something went wrong. Please try again.", 500);
  }
  return NextResponse.json({ ok: true, email });
}
