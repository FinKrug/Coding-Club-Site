# Authentication & Database

Members can sign in using **email + password** (student email or personal email verified via code) or **Google OAuth**. User accounts, verification codes, challenges, and awarded points are stored in MongoDB Atlas.

---

## Architecture & File Map

| File | Role / Responsibility |
| --- | --- |
| `lib/mongodb.js` | `withDb(fn)` opens a connection, executes queries, and closes it. (Cloudflare Workers cannot reuse connections across requests). |
| `lib/session.js` | Handles signed login cookies (`getSession()` returns the authenticated user session). |
| `app/login`, `signup`, `verify`, `forgot`, `reset` | Authentication frontend pages (forms located in `components/AuthForms.js`). |
| `app/api/auth/signup`, `verify`, `resend`, `login`, `forgot`, `reset` | Email + password flows: 6-digit email confirmation codes, 5-attempt lockout, password reset. |
| `lib/password.js` | PBKDF2 password hashing with secret pepper. |
| `lib/authCodes.js`, `lib/email.js` | Generation and verification of one-time codes; email delivery via Resend API. |
| `app/api/auth/google` | Initiates Google OAuth consent flow. |
| `app/api/auth/callback/google` | OAuth callback endpoint; creates/updates `users` collection document and establishes session cookie. |
| `app/api/auth/me` | Returns current authenticated user and total points (consumed by navbar). |
| `app/api/auth/logout` | Clears session cookie and signs out. |
| `app/account` | Account settings and challenge solve history. |
| `scripts/setup-db.mjs` | `npm run db:setup`: Verifies connection, creates collections, and sets indexes. |

---

## 1. Local MongoDB with Docker (Quickest for Development)

The repository includes a Docker Compose setup that runs a local MongoDB instance. If `MONGODB_URI` is not set in `.env.local`, the site and database scripts automatically fall back to:
```bash
mongodb://127.0.0.1:27017/coding-club
```

To start local MongoDB (and the local IntelliSense gateway):
```bash
docker compose up -d
```

Then initialize the database:
```bash
cd ActualSite/my-app
npm run db:setup
```

---

## 2. Set Up MongoDB Atlas (Cloud / Production)

1. Register at [mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register) and create a **free (M0) cluster**.
2. **Database Access** → **Add New Database User**:
   - Authentication method: Password.
   - Click **Autogenerate Secure Password** and save it.
   - Role: **Read and write to any database**.
3. **Network Access** → **Add IP Address**:
   - Choose **Allow access from anywhere** (`0.0.0.0/0`). Cloudflare Workers have dynamic IP ranges that cannot be statically whitelisted. Ensure your database password is long and secure.
4. **Connect** → **Drivers**:
   - Copy the connection URI: `mongodb+srv://...`
   - Replace `<db_password>` with your database user password.
5. In `ActualSite/my-app/.env.local`, set:
   ```bash
   MONGODB_URI="mongodb+srv://<username>:<password>@<cluster>.mongodb.net/coding-club?retryWrites=true&w=majority"
   ```
6. Run the database setup script to apply indexes and constraints:
   ```bash
   npm run db:setup
   ```
   You should see confirmation output: `"Connected to MongoDB"` and `"Indexes are in place."`

---

## 3. Configure Google Sign-In (OAuth 2.0)

1. Navigate to the [Google Cloud Console](https://console.cloud.google.com) and create a new project (e.g., `Neumont Coding Club`).
2. Go to **Google Auth Platform** (OAuth consent screen):
   - Choose User Type: **External**.
   - Provide application name, support email, and developer contact email.
   - *Note:* While in "Testing" mode, only accounts listed under *Test Users* can sign in. Publish the app when ready for all users. (No verification is required since only basic profile scopes are requested).
3. Go to **Clients** → **Create Client**:
   - Application Type: **Web application**.
   - Under **Authorized redirect URIs**, add:
     - `http://localhost:3000/api/auth/callback/google` (local Next.js dev server)
     - `http://localhost:8787/api/auth/callback/google` (local Wrangler preview)
     - `https://YOUR-SITE-DOMAIN/api/auth/callback/google` (production site)
4. Copy the credentials into `.env.local`:
   ```bash
   GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   ```

---

## 4. Session & Security Secrets

Generate cryptographic secrets for your session cookie and password hashing pepper:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Add them to `.env.local`:

```bash
SESSION_SECRET="your-generated-session-secret"
PASSWORD_PEPPER="your-generated-pepper-secret"
```

- **`SESSION_SECRET`**: Signs the session cookie. Changing it invalidates existing active sessions.
- **`PASSWORD_PEPPER`**: Random secret pepper combined with passwords before PBKDF2 hashing. It is never stored in the database. Never lose or rotate the production pepper, or all users will be required to reset their passwords.
- **`ALLOWED_EMAIL_DOMAINS`** *(Optional)*: Restricts logins to specific domains. Leave empty by default, as student email accounts and personal Google accounts may differ.

---

## 5. Email & Password Sign-In (Resend)

Registration sends a 6-digit confirmation code to verify email ownership.

### Local Development Mode
If `RESEND_API_KEY` is not provided, confirmation codes are logged directly to the terminal where `npm run dev` is running (e.g. `[email not sent: ...]`).

### Production Email Setup (Resend)
1. Sign up at [resend.com](https://resend.com) (free tier includes 3,000 emails/month).
2. Go to **Domains** → **Add Domain** (e.g., `neumontcoding.club`).
3. Add the required DNS records into Cloudflare DNS. Wait for Resend to verify the domain.
4. Go to **API Keys** → **Create API Key** with sending access.
5. Set the keys in `.env.local` / Cloudflare:
   ```bash
   RESEND_API_KEY="re_..."
   EMAIL_FROM="Neumont Coding Club <noreply@neumontcoding.club>"
   ```

### Account Linking & Security
- **Unified Accounts**: Accounts created via Google and email + password sharing the same email address automatically map to the same account document, preserving solves and points.
- **Disabling Google**: Set `GOOGLE_SIGNIN_ENABLED=false` to restrict to email authentication only.
- **Free Plan PBKDF2 Rounds**: Cloudflare Workers free tier permits 10 ms CPU per request, so passwords use 30,000 PBKDF2 iterations alongside the pepper.

---

## 6. Setting Production Secrets on Cloudflare

From `ActualSite/my-app`, deploy secrets directly to Cloudflare:

```bash
npx wrangler secret put MONGODB_URI
npx wrangler secret put SESSION_SECRET
npx wrangler secret put PASSWORD_PEPPER
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

Non-secret variables (`EMAIL_FROM`, `GOOGLE_SIGNIN_ENABLED`, `JUDGE0_URL`) can be configured in `wrangler.jsonc` under `vars` or in the Cloudflare Dashboard under *Workers & Pages → Settings → Variables and Secrets*.

For Wrangler preview runs (`npm run preview`), mirror these values inside `.dev.vars`.

---

## Troubleshooting Sign-In

- **`redirect_uri_mismatch` on Google OAuth**: The redirect URL must match the Authorized Redirect URI in the Google Cloud Console character-for-character, including protocol (`http` vs `https`) and port number.
- **Redirects back with "Sign-in failed"**: Inspect terminal logs or Cloudflare Workers live logs for the exact error (commonly an incorrect Google client secret or invalid MongoDB credentials).
- **"Email isn't set up on this site yet"**: The deployment is missing the `RESEND_API_KEY` secret.
- **Verification email not received**: Check Spam/Junk folders. Verify your sending domain in Resend's dashboard.
- **"Too many wrong passwords"**: Accounts lock for 15 minutes after 5 consecutive failed attempts. Running "Forgot password" unlocks the account immediately upon code verification.
- **`querySrv` / DNS resolution failures on Cloudflare**: In MongoDB Atlas, select *Connect → Drivers* and choose the legacy driver connection string format (`mongodb://host1,host2,host3/...`) instead of `mongodb+srv://`.
