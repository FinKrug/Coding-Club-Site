import { NextResponse } from "next/server";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/lib/session";
import { safeReturnTo, siteOrigin } from "@/lib/oauth";

// Small helpers shared by the email + password routes in app/api/auth/.

export function jsonError(message, status = 400, extra = {}) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// Only accept these forms from this site's own pages.
export function rejectCrossSite(request) {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  let originHost;
  try {
    originHost = new URL(origin).host;
  } catch {
    return jsonError("Requests from other sites aren't allowed.", 403);
  }
  const allowed = [request.headers.get("host"), new URL(siteOrigin(request)).host].filter(Boolean);
  if (!allowed.includes(originHost)) return jsonError("Requests from other sites aren't allowed.", 403);
  return null;
}

export function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export const MIN_PASSWORD_LENGTH = 10;

export function passwordProblem(password) {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`;
  }
  if (password.length > 128) return "That password is too long (128 characters max).";
  if (/^(.)\1+$/.test(password) || /^(?:0123456789|1234567890|password\d*|qwertyuiop)$/i.test(password)) {
    return "That password is too easy to guess. Try a short phrase instead.";
  }
  return null;
}

export function cleanName(value) {
  const name = String(value || "").trim().replace(/\s+/g, " ");
  return name.length >= 1 && name.length <= 60 ? name : null;
}

export function googleSignInEnabled() {
  return Boolean(process.env.GOOGLE_CLIENT_ID) && process.env.GOOGLE_SIGNIN_ENABLED !== "false";
}

// Signs the member in (sets the session cookie) and tells the page where to go.
export async function signedInResponse(user, returnTo) {
  const token = await createSessionToken({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    image: user.image ?? null,
  });
  const response = NextResponse.json({ ok: true, redirect: safeReturnTo(returnTo) });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
