import { NextResponse } from "next/server";
import {
  OAUTH_COOKIE,
  allowedEmailDomains,
  googleRedirectUri,
  oauthCookieOptions,
  pkceChallenge,
  randomToken,
  safeReturnTo,
  siteOrigin,
} from "@/lib/oauth";
import { googleSignInEnabled } from "@/lib/authHelpers";

// GET /api/auth/google?returnTo=/problems/1
// Step 1 of "Continue with Google": send the visitor to Google's account
// picker. Set GOOGLE_SIGNIN_ENABLED=false to switch Google sign-in off.
export async function GET(request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!googleSignInEnabled()) {
    // Google sign-in is switched off (or not set up): use the email login page.
    return NextResponse.redirect(new URL("/login", siteOrigin(request)));
  }

  const returnTo = safeReturnTo(new URL(request.url).searchParams.get("returnTo"));

  // `state` ties Google's reply to this browser (stops login CSRF);
  // `verifier` is the PKCE secret. Both go in a short-lived cookie that the
  // callback route checks.
  const state = randomToken();
  const verifier = randomToken(48);

  const googleUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleRedirectUri(request),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: await pkceChallenge(verifier),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();

  // If sign-in is limited to exactly one domain, ask Google to pre-filter
  // the account picker. (Only a hint: the callback enforces it for real.)
  const domains = allowedEmailDomains();
  if (domains.length === 1) googleUrl.searchParams.set("hd", domains[0]);

  const response = NextResponse.redirect(googleUrl);
  response.cookies.set(
    OAUTH_COOKIE,
    JSON.stringify({ state, verifier, returnTo }),
    oauthCookieOptions()
  );
  return response;
}
