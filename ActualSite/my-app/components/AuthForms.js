"use client";

// The sign-in / sign-up / verify / forgot / reset forms. Each page in
// app/(login, signup, verify, forgot, reset) renders one of these.

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

const MIN_PASSWORD = 10;

async function post(url, data) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await response.json().catch(() => ({}));
    return response.ok ? { ok: true, ...body } : { ok: false, error: body.error || "Something went wrong. Please try again." };
  } catch {
    return { ok: false, error: "Couldn't reach the server. Check your connection and try again." };
  }
}

function withReturn(path, params) {
  const search = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

// Full page load after signing in, so the navbar picks up the new session.
function goTo(url) {
  window.location.assign(url || "/");
}

function Field({ label, hint, ...input }) {
  return (
    <label className="auth-field">
      <span>{label}</span>
      <input {...input} />
      {hint && <small>{hint}</small>}
    </label>
  );
}

function Status({ error, notice }) {
  if (error) return <p className="auth-error" role="alert">{error}</p>;
  if (notice) return <p className="auth-notice" role="status">{notice}</p>;
  return null;
}

function GoogleButton({ returnTo }) {
  return (
    <>
      <a className="auth-google" href={withReturn("/api/auth/google", { returnTo })}>
        Continue with Google
      </a>
      <div className="auth-divider"><span>or</span></div>
    </>
  );
}

export function LoginForm({ returnTo, googleEnabled }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await post("/api/auth/login", { email, password, returnTo });
    if (result.ok) return goTo(result.redirect);
    setError(result.error);
    setBusy(false);
  }

  return (
    <div className="auth-card">
      <h1>Sign in</h1>
      {googleEnabled && <GoogleButton returnTo={returnTo} />}
      <form onSubmit={submit}>
        <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <Status error={error} />
        <button className="btn-primary auth-submit" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
      </form>
      <div className="auth-links">
        <Link href={withReturn("/forgot", { returnTo })}>Forgot password?</Link>
        <Link href={withReturn("/signup", { returnTo })}>Create an account</Link>
      </div>
      {googleEnabled && (
        <p className="auth-small">
          Signed up with Google before? Use “Continue with Google”, or set a password with “Forgot password”.
        </p>
      )}
    </div>
  );
}

export function SignupForm({ returnTo, googleEnabled }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(event) {
    event.preventDefault();
    if (password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters for your password.`);
      return;
    }
    setBusy(true);
    setError(null);
    const result = await post("/api/auth/signup", { name, email, password });
    if (result.ok) return router.push(withReturn("/verify", { email: result.email, returnTo }));
    setError(result.error);
    setBusy(false);
  }

  return (
    <div className="auth-card">
      <h1>Create an account</h1>
      {googleEnabled && <GoogleButton returnTo={returnTo} />}
      <form onSubmit={submit}>
        <Field label="Name" autoComplete="name" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          required
          hint="Your Neumont student email works, or any other email."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD}
          hint={`At least ${MIN_PASSWORD} characters. A short phrase is easy to remember.`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Status error={error} />
        <button className="btn-primary auth-submit" disabled={busy}>{busy ? "Sending code..." : "Create account"}</button>
      </form>
      <p className="auth-small">We&apos;ll email you a 6-digit code to confirm the address.</p>
      <div className="auth-links">
        <Link href={withReturn("/login", { returnTo })}>Already have an account? Sign in</Link>
      </div>
    </div>
  );
}

function ResendButton({ email, purpose }) {
  const [state, setState] = useState({ busy: false, error: null, notice: null });
  async function resend() {
    setState({ busy: true, error: null, notice: null });
    const result = await post("/api/auth/resend", { email, purpose });
    setState({ busy: false, error: result.ok ? null : result.error, notice: result.ok ? "New code sent. Check your email." : null });
  }
  return (
    <>
      <button type="button" className="auth-text-button" onClick={resend} disabled={state.busy}>
        {state.busy ? "Sending..." : "Send a new code"}
      </button>
      <Status error={state.error} notice={state.notice} />
    </>
  );
}

export function VerifyForm({ email, returnTo }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await post("/api/auth/verify", { email, code, returnTo });
    if (result.ok) return goTo(result.redirect);
    setError(result.error);
    setBusy(false);
  }

  if (!email) {
    return (
      <div className="auth-card">
        <h1>Check your email</h1>
        <p>Start from the <Link href="/signup">sign-up page</Link>.</p>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <h1>Check your email</h1>
      <p className="auth-lead">
        We sent a 6-digit code to <strong>{email}</strong>. It expires in 15 minutes. Not there? Check your junk or spam folder.
      </p>
      <form onSubmit={submit}>
        <Field
          label="Code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          required
          className="auth-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <Status error={error} />
        <button className="btn-primary auth-submit" disabled={busy}>{busy ? "Checking..." : "Confirm and sign in"}</button>
      </form>
      <div className="auth-links">
        <ResendButton email={email} purpose="signup" />
        <Link href={withReturn("/signup", { returnTo })}>Wrong email? Start over</Link>
      </div>
    </div>
  );
}

export function ForgotForm({ returnTo }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await post("/api/auth/forgot", { email });
    if (result.ok) return router.push(withReturn("/reset", { email: result.email, returnTo }));
    setError(result.error);
    setBusy(false);
  }

  return (
    <div className="auth-card">
      <h1>Reset your password</h1>
      <p className="auth-lead">Enter your account&apos;s email and we&apos;ll send you a code to set a new password.</p>
      <form onSubmit={submit}>
        <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Status error={error} />
        <button className="btn-primary auth-submit" disabled={busy}>{busy ? "Sending..." : "Send code"}</button>
      </form>
      <div className="auth-links">
        <Link href={withReturn("/login", { returnTo })}>Back to sign in</Link>
      </div>
    </div>
  );
}

export function ResetForm({ email, returnTo }) {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(event) {
    event.preventDefault();
    if (password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters for your password.`);
      return;
    }
    setBusy(true);
    setError(null);
    const result = await post("/api/auth/reset", { email, code, password, returnTo });
    if (result.ok) return goTo(result.redirect);
    setError(result.error);
    setBusy(false);
  }

  if (!email) {
    return (
      <div className="auth-card">
        <h1>Reset your password</h1>
        <p>Start from the <Link href="/forgot">forgot password page</Link>.</p>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <h1>Set a new password</h1>
      <p className="auth-lead">
        If there&apos;s an account for <strong>{email}</strong>, we sent it a 6-digit code. Not there? Check your junk or spam folder.
      </p>
      <form onSubmit={submit}>
        <Field
          label="Code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          required
          className="auth-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <Field
          label="New password"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD}
          hint={`At least ${MIN_PASSWORD} characters.`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Status error={error} />
        <button className="btn-primary auth-submit" disabled={busy}>{busy ? "Saving..." : "Save password and sign in"}</button>
      </form>
      <div className="auth-links">
        <ResendButton email={email} purpose="reset" />
        <Link href={withReturn("/forgot", { returnTo })}>Use a different email</Link>
      </div>
    </div>
  );
}
