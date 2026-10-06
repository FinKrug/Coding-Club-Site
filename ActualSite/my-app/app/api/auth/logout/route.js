import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";
import { siteOrigin } from "@/lib/oauth";

// POST /api/auth/logout — clears the session cookie. POST (from a <form>)
// rather than GET so another site can't sign people out with a plain link.
export async function POST(request) {
  const response = NextResponse.redirect(new URL("/", siteOrigin(request)), 303);
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}
