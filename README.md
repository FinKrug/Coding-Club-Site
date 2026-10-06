## Coding-Club-Site

One of my current passion projects is developing the Coding Club website. This project is still a work in progress, but its main goal is to create an engaging and accessible platform that encourages more people to learn programming and explore the world of technology.

Through this website, I aim to provide resources, project showcases, event information, and opportunities for members to collaborate and grow their technical skills. I want the platform to make coding feel approachable for beginners while also giving experienced programmers a place to connect, share ideas, and build exciting projects together.

As development continues, I plan to expand the site's features and content based on community feedback. Ultimately, my vision is for the website to inspire curiosity, foster creativity, and help more people discover the fun and rewarding experience of coding.

The site is a [Next.js](https://nextjs.org) app (`ActualSite/my-app`) deployed to [Cloudflare Workers](https://workers.cloudflare.com/) using the [OpenNext](https://opennext.js.org/cloudflare) adapter. The code runner talks to a self-hosted [Judge0](https://judge0.com/) instance through a Next.js API route (`app/api/run`). IntelliSense (real completions/diagnostics, not just Monaco's built-ins) is served by `lsp-gateway/`, a small WebSocket gateway in front of per-language language servers. Anyone using the site can also opt out of both hosted services from the site's own Run Settings panel and point it at a Judge0 + lsp-gateway running in Docker on their own machine instead — see `local-dev-tools/README.md`.

# Getting This Website Running

Welcome! If you've never worked with a website project before, don't worry. Follow the steps below and you'll have the site running on your computer.

---

# Step 1: Install Node.js

This project uses Next.js, which requires Node.js to run.

1. Go to https://nodejs.org
2. Download the **LTS (Long-Term Support)** version.
3. Install it using the default settings.

After installation, verify it worked:

```bash
node -v
npm -v
```

You should see version numbers displayed. If you do, you're ready to continue.

---

# Step 2: Download the Project

### Option A: Download ZIP

1. Open the GitHub repository.
2. Click the green **Code** button.
3. Select **Download ZIP**.
4. Extract the ZIP file somewhere on your computer.

### Option B: Clone with Git

```bash
git clone https://github.com/FinKrug/Coding-Club-Site.git
```

---

# Step 3: Open a Terminal in the App Folder

The Next.js app lives in `ActualSite/my-app`, not the repo root.

```bash
cd Coding-Club-Site/ActualSite/my-app
```

---

# Step 4: Install Project Dependencies

```bash
npm install
```

This downloads everything the website needs to run. The first install may take a few minutes.

---

# Step 5: Environment Variables

The app needs an environment variable, `JUDGE0_URL` (the compiler API it calls), in a new `.env.local` file in `ActualSite/my-app` (this file is git-ignored and never committed). Point it at the real self-hosted instance — it requires an auth token as well (ask a maintainer for `JUDGE0_AUTH_TOKEN` — never commit it):

```bash
JUDGE0_URL=https://judge0.neumontcoding.club
JUDGE0_AUTH_TOKEN=<ask a maintainer>
```

(There's no local Docker option for Judge0 to point at instead — see "Running IntelliSense Locally" below for why.)

A `.dev.vars` file with the same values is also used when previewing through Wrangler (see below) — it's git-ignored too.

Accounts and points also need MongoDB and Google sign-in values (`MONGODB_URI`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`). `ActualSite/my-app/.env.example` lists every variable — copy it to `.env.local` and fill it in. See **Accounts & Database** below for where each value comes from. Without them the site still runs; signing in just won't work.

---

# Step 6: Start the Website

```bash
npm run dev
```

The terminal will display a local URL:

```text
http://localhost:3000
```

Open that URL in your browser. You should now see the website running locally.

---

# Making Changes

Most of the website code lives in:

```text
app/         - pages and API routes (App Router)
components/  - shared React components
lib/         - helpers: code runner, IntelliSense, Run Settings (client);
               MongoDB, sessions, Google sign-in (server-only)
data/        - resources content, plus starter challenges (data/challenges.json)
```

When you edit files and save them, the browser will automatically refresh and show your changes.

---

# Running IntelliSense Locally

If you'd rather get real IntelliSense (completions/diagnostics for Python, C/C++, Rust, Go and Java) from a gateway on your own machine instead of our hosted one, the site's own **Resources** page (`/resources`) has a one-click download of everything needed (Docker Compose setup + the IntelliSense source, no repo clone required) plus setup steps. The same files live in this repo under `local-dev-tools/` if you'd rather browse them here — `local-dev-tools/README.md` has the full walkthrough and troubleshooting guide. The downloadable zip is generated automatically from `local-dev-tools/` and `lsp-gateway/` by `ActualSite/my-app/scripts/build-local-dev-tools-zip.js`, which runs before every `dev`/`build`/`preview`/`deploy`, so it never goes stale — there's nothing to update by hand when either folder changes.

Note this is IntelliSense only — there's no local option for the code runner (Judge0) anymore. Judge0's sandboxing needs the legacy cgroup v1 hierarchy, which WSL2 no longer supports at all as of WSL version 2.5.1, so it can't run under Docker on Windows regardless of setup; `local-dev-tools/README.md` has the full story. "Run Code" always uses the hosted Judge0 (Step 5 above).

---

# Accounts & Database

Members sign in with **email + password** (their Neumont student email or any other email, confirmed with an emailed code) or with **Google**. Accounts and points live in MongoDB Atlas. Here's how the pieces fit:

| File | What it does |
| --- | --- |
| `lib/mongodb.js` | `withDb(fn)` opens a connection, runs your queries, closes it. (Cloudflare Workers can't reuse a connection across requests, so there's no shared global client.) |
| `lib/session.js` | Signed login cookie (`getSession()` tells you who's signed in). |
| `app/login`, `app/signup`, `app/verify`, `app/forgot`, `app/reset` | The sign-in pages (forms in `components/AuthForms.js`). |
| `app/api/auth/signup`, `verify`, `resend`, `login`, `forgot`, `reset` | Email + password accounts: emailed 6-digit codes, a 5-try lockout, password reset. |
| `lib/password.js` | Password hashing (PBKDF2 + a secret "pepper"). |
| `lib/authCodes.js`, `lib/email.js` | Emailed codes, and sending email through Resend. |
| `app/api/auth/google` | Sends the visitor to Google's account picker ("Continue with Google"). |
| `app/api/auth/callback/google` | Google sends them back here; creates/updates their `users` document and sets the cookie. |
| `app/api/auth/me` | Who's signed in + their current points (used by the navbar). |
| `app/api/auth/logout` | Signs out. |
| `app/account` | The account page. |
| `scripts/setup-db.mjs` | `npm run db:setup`: tests the connection and creates indexes. |

## 1. Create the MongoDB database (free)

1. Sign up at https://www.mongodb.com/cloud/atlas/register and create a **free (M0) cluster**.
2. **Database Access** → *Add New Database User* → password authentication, click *Autogenerate Secure Password* (save it somewhere), role **Read and write to any database**.
3. **Network Access** → *Add IP Address* → **Allow access from anywhere** (`0.0.0.0/0`). Cloudflare Workers don't have a fixed IP address, so there's no narrower option. That's why the database user's password needs to be long and random.
4. **Connect** → *Drivers* → copy the `mongodb+srv://...` connection string and replace `<db_password>` with the password from step 2.
5. Put it in `ActualSite/my-app/.env.local` as `MONGODB_URI=...`, then from `ActualSite/my-app` run:

   ```bash
   npm run db:setup
   ```

   You should see "Connected to MongoDB" and "Indexes are in place."

## 2. Create the Google sign-in credentials (free)

1. Go to https://console.cloud.google.com, create a project (e.g. "Neumont Coding Club").
2. Open **Google Auth Platform** (a.k.a. *OAuth consent screen*) → *Get started*: app name, support email, audience **External**. While the app is in *Testing*, only accounts you add under *Audience → Test users* can sign in; click *Publish app* when you're ready for everyone. (The site only asks for name, email and profile picture, so Google doesn't require a review.)
3. **Clients** → *Create client* → type **Web application**. Under **Authorized redirect URIs** add:
   - `http://localhost:3000/api/auth/callback/google` (`npm run dev`)
   - `http://localhost:8787/api/auth/callback/google` (`npm run preview`)
   - `https://YOUR-SITE-DOMAIN/api/auth/callback/google` (the live site)
4. Copy the **Client ID** and **Client secret** into `.env.local` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

## 3. Session secret

`SESSION_SECRET` signs the login cookie. Generate one and put it in `.env.local`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Changing it later signs everyone out (harmless).

Optional: `ALLOWED_EMAIL_DOMAINS` restricts sign-in to certain email domains. **Leave it empty for now.** Neumont school emails aren't Google accounts, so restricting to a school domain would lock out nearly everyone. Members sign in with their personal Google account instead.

Restart `npm run dev`, click **Sign in** in the navbar, and you should land back on the site with your avatar and `0 pts`. The account shows up in Atlas under *Browse Collections → coding-club → users*.

## 4. Email + password sign-in

Sign-up emails a 6-digit code to confirm the address. That means a Neumont student email gets proven to belong to that student, which Google sign-in can't do. Same for "Forgot password".

**While developing you don't need anything:** with `RESEND_API_KEY` empty, the codes are printed in the terminal running `npm run dev` (look for `[email not sent: ...]`).

**`PASSWORD_PEPPER`** is a random secret mixed into every password before it's hashed, and it's stored only in Cloudflare, never in the database. Generate it like `SESSION_SECRET`. **Never change or lose the production one.** If you do, every password stops working and members have to use "Forgot password". (Your local `.env.local` already has one.)

**To send real emails (Resend, free for 3,000 emails/month, 100/day):**

1. Sign up at https://resend.com.
2. **Domains → Add Domain**: enter `neumontcoding.club`, then add the DNS records Resend shows in Cloudflare (your domain → **DNS → Records**). Wait until Resend says **Verified**. Until then Resend only delivers to your own address.
3. **API Keys → Create API Key** (sending access) and put it in `RESEND_API_KEY`.
4. Set `EMAIL_FROM` to an address on that domain, e.g. `Neumont Coding Club <noreply@neumontcoding.club>`.
5. Test by signing up with a student email. School email runs on Microsoft and may put the first emails in **Junk**. If so, mark it "Not junk".

**Google and email accounts with the same address are one account.** A member who used "Continue with Google" can sign up (or use "Forgot password") with the same email to add a password, keeping their points, and vice versa. To turn Google off entirely, set `GOOGLE_SIGNIN_ENABLED=false`. Members who only ever used Google can still get in with "Forgot password" on their Gmail address.

**Password strength trade-off:** the club is on the Workers **Free** plan, which allows only 10 ms of CPU per request, so passwords are hashed with 30,000 PBKDF2 rounds instead of the usual 600,000. The pepper makes up for most of that: stolen hashes can't be cracked without it. If the club moves to Workers **Paid** ($5/month), raise `ITERATIONS` in `lib/password.js` (Workers allows up to 100,000). Each member's hash upgrades automatically the next time they sign in.

## 5. Production secrets

Copy the values into Cloudflare, once, from `ActualSite/my-app`:

```bash
npx wrangler secret put MONGODB_URI
npx wrangler secret put SESSION_SECRET
npx wrangler secret put PASSWORD_PEPPER
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

`EMAIL_FROM` and `GOOGLE_SIGNIN_ENABLED` aren't secret. Add them under `vars` in `wrangler.jsonc` next to `JUDGE0_URL`, or as plain variables in the dashboard. (Or set everything in the Cloudflare dashboard: your Worker → *Settings → Variables and Secrets*.) Use a **different** `SESSION_SECRET` and `PASSWORD_PEPPER` in production than on your laptop. For `npm run preview`, put the same values in `.dev.vars`.

After updating the site, run `npm run db:setup` again: it adds the one-account-per-email rule and the table for emailed codes.

## Troubleshooting sign-in

- **Google says `redirect_uri_mismatch`**: the URL in the error must be listed *exactly* under Authorized redirect URIs (step 2.3), including `http` vs `https` and the port.
- **Bounced back with "Sign-in failed"**: check the terminal / Cloudflare logs; it prints the real reason (often a wrong client secret, or the database password).
- **"Email isn't set up on this site yet"**: the live site has no `RESEND_API_KEY` secret.
- **Code email never arrives**: check Junk/Spam, then the Resend dashboard's **Emails** log (it shows whether it was delivered or bounced). Until your domain is verified, Resend only sends to your own address.
- **"Too many wrong passwords"**: an account locks for 15 minutes after 5 wrong passwords in a row. "Forgot password" unlocks it immediately.
- **`querySrv` / DNS errors only on Cloudflare**: in Atlas, *Connect → Drivers*, pick the oldest driver version listed to get the long `mongodb://host1,host2,host3/...` form of the connection string, and use that instead of `mongodb+srv://`.

---

# Adding a Challenge

Challenges live in MongoDB (the `challenges` collection), so adding one is copy, paste, done. There's no code change or redeploy, and it shows up on the site right away.

**First time only**, from `ActualSite/my-app`:

```bash
npm run db:setup   # turns on the challenge validation rules
npm run db:seed    # copies the starter challenges in data/challenges.json into the database
```

**To add a challenge:**

1. In Atlas, open your cluster, then **Browse Collections** (or **Data Explorer**), then **coding-club**, then **challenges**.
2. Click **Insert Document**, switch the view to **JSON** (the `{}` button), and paste:

   ```json
   {
     "id": 3,
     "title": "Reverse a String",
     "difficulty": "Easy",
     "week": "Week 2",
     "points": 10,
     "published": true,
     "description": "Write a function that returns the given string backwards.\n\nFor example, `hello` becomes `olleh`.",
     "function": {
       "name": "reverseString",
       "params": [{ "name": "s", "type": "string" }],
       "returns": "string"
     },
     "tests": [
       { "args": ["hello"], "expected": "olleh" },
       { "args": [""], "expected": "" },
       { "args": ["racecar!"], "expected": "!racecar", "hidden": true },
       { "args": ["a b  c"], "expected": "c  b a", "hidden": true }
     ]
   }
   ```

3. Change the values and click **Insert**. It's live at `/problems/3`, with starter code for every language and Run / Submit buttons.

| Field | Required? | What it is |
| --- | --- | --- |
| `id` | yes | Whole number, unique per challenge. It's the URL (`/problems/3`), so use the next unused number. |
| `title` | yes | Challenge name. |
| `difficulty` | yes | Exactly `Easy`, `Medium` or `Hard`. |
| `description` | yes | The problem statement. `\n\n` starts a new paragraph; `` `code` `` and `**bold**` work. |
| `function` | for tests | The function members write: its `name`, `params` (each with a `name` and `type`) and `returns` type. See below. |
| `tests` | for tests | The test cases. See below. |
| `week` | no | Groups challenges on the list page, e.g. `"Week 2"` (defaults to Week 1). |
| `points` | no | Base points for solving it (defaults to 10). Solving in Python, Java or C# earns 1.5× (rounded). |
| `timeLimitSeconds` | no | How long the whole test run may take, 1 to 10 seconds (defaults to 2). Raise it for challenges with big stress tests. |
| `published` | no | `false` hides it while you're still writing it. |
| `examples` | no | Hand-written `{ "input": "...", "output": "..." }` examples. If you leave this out, the page shows the visible tests as examples instead. |

If Atlas says **"Document failed validation"**, a field is missing or has the wrong type (for example `"difficulty": "easy"` in lowercase), and the error says which. A duplicate `id` fails with **"duplicate key"**.

## Writing tests

Every challenge with a `function` and `tests` is graded automatically:

- **Run Code** runs only the visible tests and shows the input, the expected answer, what the member's code returned, and anything it printed.
- **Submit** (sign-in required) runs **every** test, including ones marked `"hidden": true`. Members only see whether each hidden test passed. They never see the inputs, the expected answers or what their code printed, so they can't just hard-code the answers. Use hidden tests for edge cases (empty input, negative numbers, duplicates) and stress tests (big inputs that a slow solution can't finish in time).

**Types** for `params` and `returns`: `int`, `long`, `double`, `bool`, `string`, or a list of one of those (`int[]`, `string[]`, ...), or a grid (`int[][]`, ...). In the tests, write values as plain JSON: `5`, `2.5`, `true`, `"text"`, `[1, 2, 3]`, `[[1, 2], [3, 4]]`.

- `int` is a 32-bit whole number (up to ±2,147,483,647). Use `long` for bigger ones.
- `double` answers count as correct if they're within 0.000001 of the expected value, so rounding differences don't fail anyone.
- Add `"anyOrder": true` inside `function` when the function returns a list and any order should be accepted.
- C doesn't support grids (`[][]`), so challenges that use them leave C out of the language list.

**Each test** is `{ "args": [...], "expected": ... }`, with one entry in `args` per parameter, in order. A function with no parameters uses `"args": []`.

**Names:** the function and parameter names must start with a letter and can't be a reserved word in any of the 9 languages (`string`, `type`, `len`, `new` and similar are rejected). The site writes the starter code for every language from these names, so pick names that read well in all of them, like `nums`, `target`, `words`.

**Check your work:** run `npm run db:check` to check every challenge's tests at once. A challenge with a mistake also shows a warning on its page instead of a broken Submit button. To test a challenge, open it and submit a correct solution in a couple of languages. Then submit a deliberately slow or wrong one and make sure the hidden tests catch it.

**First time after updating the site**, run `npm run db:setup` again (it turns on the validation rules for `function` and `tests`). To upgrade the starter challenges #1 and #2 to the versions with tests in `data/challenges.json`, run `npm run db:seed -- --update`. That overwrites those two in the database.

**If you change anything in `lib/judge/`** (the code that runs tests in each language), run `npm run judge:selftest`. It submits correct solutions to sample challenges in all 9 languages to the Judge0 server and checks that they all pass.

To edit a challenge, click the pencil on its document in Atlas. To remove one, delete the document or set `"published": false`.

---

# Points

A **Submit** that passes every test earns points, **once per challenge per language**. Solving Hello World in Python earns its Python points, solving it again in Python earns nothing, and solving it in Java earns the Java points too. Python, Java and C# earn **1.5×** the challenge's `points` (rounded). Other languages earn 1×. Run Code never earns points.

- Each award is saved in the `solves` collection (who solved which challenge in which language, and how many points it earned). Members see their solves on challenge pages, the challenge list and their account page.
- A unique index on `solves` makes it impossible to earn the same points twice, even with a double-clicked Submit. **Run `npm run db:setup` after updating** so that index exists.
- `users.points` is the running total. If a total ever looks wrong, `npm run points:recalc` shows who's off, and `npm run points:recalc -- --fix` rebuilds every total from `solves`.
- The 1.5× multiplier and which languages get it live in `lib/judge/languageList.mjs` (`PRIORITY_MULTIPLIER` and `priority: true`).
- To give or take points by hand for now, edit the user's `points` in Atlas. Note that `points:recalc -- --fix` will undo manual edits.

---

# Deploying to Cloudflare

The app deploys to Cloudflare Workers via the OpenNext adapter. From `ActualSite/my-app`:

```bash
npx wrangler login   # one-time, opens a browser to authenticate with Cloudflare
npm run deploy        # builds the app and deploys it
```

`npm run deploy` runs `opennextjs-cloudflare build` followed by `opennextjs-cloudflare deploy`. To try a production build locally first (in the actual Workers runtime, via Wrangler) without deploying, run `npm run preview` instead.

Non-secret configuration (like `JUDGE0_URL`) lives in `wrangler.jsonc` under `vars`. If the project ever needs a real secret (an API key, for example), set it with `npx wrangler secret put <NAME>` instead of putting it in `wrangler.jsonc` or committing it anywhere.

Alternatively, you can connect this GitHub repository to Cloudflare directly from the Cloudflare dashboard (Workers & Pages → Create → Connect to Git) so every push to `main` deploys automatically, with no local Wrangler login needed.

---

# Common Problems

## "node is not recognized"

Node.js is not installed correctly. Reinstall it from https://nodejs.org, then restart your terminal.

## "npm install" fails

Try:

```bash
npm cache clean --force
npm install
```

If the issue continues, delete `node_modules` and `package-lock.json`, then run `npm install` again.

## Port Already In Use

Close other running Next.js/dev servers, or let Next.js pick a different port when prompted.

---

# Need Help?

If something isn't working:

1. Make sure Node.js is installed.
2. Run `npm install` inside `ActualSite/my-app`.
3. Run `npm run dev`.
4. Read any error messages shown in the terminal.

Happy coding!
