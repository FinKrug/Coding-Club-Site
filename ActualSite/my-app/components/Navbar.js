"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import SettingsModal from "./SettingsModal";
import { getRunnerSettings, subscribeRunnerSettings } from "@/lib/runnerSettings";

// Pages that are part of signing in; never "return" to these afterwards.
const AUTH_PAGES = /^\/(login|signup|verify|forgot|reset)\b/;

const AUTH_ERRORS = {
  cancelled: "Sign-in was cancelled.",
  disabled: "Google sign-in is turned off. Please sign in with your email instead.",
  domain: "That email address isn't allowed to sign in here. Try a different Google account.",
};

function Navbar() {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(null);
  // undefined = still checking, null = signed out, object = signed in
  const [user, setUser] = useState(undefined);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    setSettings(getRunnerSettings());
    return subscribeRunnerSettings(setSettings);
  }, []);

  // Re-check on navigation, and whenever points are earned, so the point
  // total stays current.
  const [refreshCount, setRefreshCount] = useState(0);
  useEffect(() => {
    const refresh = () => setRefreshCount((n) => n + 1);
    window.addEventListener("ncc:points-changed", refresh);
    return () => window.removeEventListener("ncc:points-changed", refresh);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { user: null }))
      .then((data) => !cancelled && setUser(data.user))
      .catch(() => !cancelled && setUser(null));
    return () => {
      cancelled = true;
    };
  }, [pathname, refreshCount]);

  // The sign-in callback redirects to /?authError=... when something fails.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("authError");
    if (!code) return;
    setAuthError(AUTH_ERRORS[code] || "Sign-in failed. Please try again.");
    params.delete("authError");
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      window.location.pathname + (query ? `?${query}` : "")
    );
  }, []);

  const usingLocalTools = Boolean(
    settings && (settings.useLocalJudge0 || settings.useLocalLsp)
  );

  return (
    <>
      <nav className="navbar">
        <Link href="/" className="navbar-brand">
          <span className="navbar-mark" aria-hidden="true">N</span>
          <span className="navbar-wordmark">
            Neumont
            <span>Coding Club</span>
          </span>
        </Link>

        <div className="navbar-links">
          <Link href="/" className="nav-link">
            Home
          </Link>
          <Link href="/problems" className="nav-link">
            Challenges
          </Link>
          <Link href="/resources" className="nav-link">
            Resources
          </Link>
          <button
            type="button"
            className="settings-trigger"
            onClick={() => setSettingsOpen(true)}
          >
            <span className="gear-icon" aria-hidden="true">
              ⚙
            </span>
            Run Settings
            {usingLocalTools && (
              <span className="local-dot" title="Using tools on your own machine" />
            )}
          </button>

          {user === undefined ? (
            <span className="nav-account-placeholder" aria-hidden="true" />
          ) : user ? (
            <Link href="/account" className="nav-account" title="Your account">
              {user.image ? (
                <img
                  src={user.image}
                  alt=""
                  className="nav-avatar"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="nav-avatar nav-avatar-fallback" aria-hidden="true">
                  {user.name?.[0]?.toUpperCase() ?? "?"}
                </span>
              )}
              {user.points !== null && (
                <span className="nav-points">{user.points.toLocaleString()} pts</span>
              )}
            </Link>
          ) : (
            <Link
              href={`/login?returnTo=${encodeURIComponent(AUTH_PAGES.test(pathname || "") ? "/" : pathname || "/")}`}
              className="nav-signin"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>

      {authError && (
        <div className="auth-error-banner" role="alert">
          {authError}
          <button
            type="button"
            onClick={() => setAuthError(null)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </>
  );
}

export default Navbar;
