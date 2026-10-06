// Sends email through Resend (https://resend.com). Server-only.
//
// Settings:
//   RESEND_API_KEY   from the Resend dashboard (API Keys)
//   EMAIL_FROM       e.g. "Neumont Coding Club <noreply@neumontcoding.club>".
//                    Its domain must be verified in Resend.
//
// With no RESEND_API_KEY, emails are printed to the terminal instead, so
// sign-up works during local development. On the live site a missing key
// is an error (set EMAIL_LOG_ONLY=true to allow terminal-only for testing).

export class EmailError extends Error {}

function logOnly() {
  return process.env.NODE_ENV !== "production" || process.env.EMAIL_LOG_ONLY === "true";
}

export async function sendEmail({ to, subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    if (logOnly()) {
      console.log(`\n[email not sent: RESEND_API_KEY isn't set]\nTo: ${to}\nSubject: ${subject}\n\n${text}\n`);
      return;
    }
    throw new EmailError("Email isn't set up on this site yet (RESEND_API_KEY is missing).");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Neumont Coding Club <onboarding@resend.dev>",
      to: [to],
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    console.error("Resend error:", response.status, details);
    throw new EmailError("We couldn't send the email. Please try again in a minute.");
  }
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// The one email the site sends: a 6-digit code.
export async function sendCodeEmail({ to, code, purpose }) {
  const action = purpose === "reset" ? "reset your password" : "finish creating your account";
  const subject = purpose === "reset" ? `${code} is your password reset code` : `${code} is your Neumont Coding Club code`;
  const text =
    `Your Neumont Coding Club code is ${code}\n\n` +
    `Enter it on the site to ${action}. It expires in 15 minutes.\n\n` +
    `If you didn't ask for this, you can ignore this email.`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
      <h2 style="margin:0 0 16px">Neumont Coding Club</h2>
      <p>Enter this code on the site to ${escapeHtml(action)}:</p>
      <p style="font-size:32px;font-weight:bold;letter-spacing:6px;margin:16px 0">${escapeHtml(code)}</p>
      <p style="color:#555">It expires in 15 minutes. If you didn't ask for this, you can ignore this email.</p>
    </div>`;
  await sendEmail({ to, subject, text, html });
}
