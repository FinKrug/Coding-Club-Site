import { NextResponse } from "next/server";
import { withDb } from "@/lib/mongodb";
import { createCode, CodeCooldownError } from "@/lib/authCodes";
import { sendCodeEmail, EmailError } from "@/lib/email";
import { jsonError, normalizeEmail, readJson, rejectCrossSite } from "@/lib/authHelpers";

// POST /api/auth/resend  { email, purpose: "signup" | "reset" }
// Sends a fresh code (at most once a minute).
export async function POST(request) {
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;

  const body = (await readJson(request)) || {};
  const email = normalizeEmail(body.email);
  const purpose = body.purpose === "reset" ? "reset" : "signup";
  if (!email) return jsonError("Enter a valid email address.");

  try {
    const code = await withDb(async (db) => {
      const pending = await db.collection("authCodes").findOne({ email, purpose });
      if (!pending) return null;
      return createCode(db, { email, purpose, data: pending.data || {} });
    });
    if (!code) {
      return jsonError(purpose === "signup" ? "That sign-up has expired. Please sign up again." : "Ask for a new code from “Forgot password”.");
    }
    await sendCodeEmail({ to: email, code, purpose });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof CodeCooldownError) return jsonError(error.message, 429);
    if (error instanceof EmailError) return jsonError(error.message, 502);
    console.error("Resend failed:", error);
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
