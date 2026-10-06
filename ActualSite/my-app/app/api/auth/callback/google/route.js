import { NextResponse } from "next/server";
import { decodeJwt } from "jose";
import { withDb } from "@/lib/mongodb";
import { googleSignInEnabled } from "@/lib/authHelpers";
import {
  OAUTH_COOKIE,
  allowedEmailDomains,
  googleRedirectUri,
  oauthCookieOptions,
  safeReturnTo,
  siteOrigin,
} from "@/lib/oauth";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/session";

const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

// GET /api/auth/callback/google
// Step 2: Google sends the visitor back here with a one-time `code`. We
// trade it for their profile, create/update their account in MongoDB, and
// set the session cookie.
export async function GET(request) {
  const url = new URL(request.url);
  const origin = siteOrigin(request);

  const finish = (path, sessionToken) => {
    const response = NextResponse.redirect(new URL(path, origin));
    response.cookies.set(OAUTH_COOKIE, "", { ...oauthCookieOptions(), maxAge: 0 });
    if (sessionToken) {
      response.cookies.set(SESSION_COOKIE, sessionToken, sessionCookieOptions());
    }
    return response;
  };
  const fail = (reason) => finish(`/?authError=${reason}`);

  if (!googleSignInEnabled()) return fail("disabled");
  if (url.searchParams.get("error")) return fail("cancelled");

  let saved = null;
  try {
    saved = JSON.parse(request.cookies.get(OAUTH_COOKIE)?.value || "null");
  } catch {
    saved = null;
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!saved || !code || !state || state !== saved.state) return fail("state");

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: googleRedirectUri(request),
        grant_type: "authorization_code",
        code_verifier: saved.verifier,
      }),
    });

    if (!tokenResponse.ok) {
      console.error("Google token exchange failed:", await tokenResponse.text());
      return fail("google");
    }

    const { id_token: idToken } = await tokenResponse.json();

    // We received this ID token directly from Google's token endpoint over
    // HTTPS, so (per OpenID Connect Core §3.1.3.7) the TLS connection itself
    // proves it's genuine. We still check it was issued for *our* app.
    const claims = decodeJwt(idToken);
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (
      claims.aud !== clientId ||
      !GOOGLE_ISSUERS.includes(claims.iss) ||
      !claims.exp ||
      claims.exp < nowSeconds ||
      !claims.sub ||
      !claims.email ||
      claims.email_verified !== true
    ) {
      return fail("google");
    }

    const email = String(claims.email).toLowerCase();
    const domains = allowedEmailDomains();
    if (domains.length && !domains.includes(email.split("@")[1])) {
      return fail("domain");
    }

    const name = claims.name || email.split("@")[0];
    const image = claims.picture || null;
    const now = new Date();

    // 1. An account already linked to this Google user.
    // 2. Otherwise an account with the same email, e.g. one made with email +
    //    password: link it (Google has confirmed the address is theirs).
    // 3. Otherwise a brand-new account.
    const user = await withDb(async (db) => {
      const users = db.collection("users");
      const linked = await users.findOneAndUpdate(
        { googleId: claims.sub },
        { $set: { image, lastLoginAt: now } },
        { returnDocument: "after" }
      );
      if (linked) return linked;

      const sameEmail = await users.findOneAndUpdate(
        { email, googleId: { $exists: false } },
        { $set: { googleId: claims.sub, emailVerified: true, lastLoginAt: now } },
        { returnDocument: "after" }
      );
      if (sameEmail) {
        if (!sameEmail.image && image) await users.updateOne({ _id: sameEmail._id }, { $set: { image } });
        return sameEmail;
      }

      const doc = {
        googleId: claims.sub,
        email,
        emailVerified: true,
        name,
        image,
        points: 0,
        role: "member",
        createdAt: now,
        lastLoginAt: now,
      };
      try {
        const { insertedId } = await users.insertOne(doc);
        return { ...doc, _id: insertedId };
      } catch (error) {
        // Two sign-ins at once both tried to create the account.
        if (error.code === 11000) {
          const again = await users.findOne({ googleId: claims.sub });
          if (again) return again;
        }
        throw error;
      }
    });

    const sessionToken = await createSessionToken({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      image: user.image ?? null,
    });

    return finish(safeReturnTo(saved.returnTo), sessionToken);
  } catch (error) {
    console.error("Sign-in failed:", error);
    return fail("server");
  }
}
