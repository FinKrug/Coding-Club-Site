import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// Login sessions are a signed cookie (a JWT signed with SESSION_SECRET).
// Nobody can forge or edit one without the secret, so the server can trust
// "this request is from user X" without a database lookup. Anything that can
// change — like a point balance — is NOT stored in here; always read that
// fresh from MongoDB.

export const SESSION_COOKIE = "ncc_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set to a random string of at least 32 characters."
    );
  }
  return new TextEncoder().encode(secret);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true, // page JavaScript can't read it, so XSS can't steal it
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

export async function createSessionToken({ id, name, email, image }) {
  return new SignJWT({ name, email, image })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

// Returns { userId, name, email, image } for the signed-in visitor, or null.
// Works in route handlers and server components.
export async function getSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    return {
      userId: payload.sub,
      name: payload.name,
      email: payload.email,
      image: payload.image ?? null,
    };
  } catch (error) {
    if (error.message?.startsWith("SESSION_SECRET")) console.error(error.message);
    return null; // expired, tampered with, or signed with an old secret
  }
}
