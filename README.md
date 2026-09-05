## Coding-Club-Site

One of my current passion projects is developing the Coding Club website. This project is still a work in progress, but its main goal is to create an engaging and accessible platform that encourages more people to learn programming and explore the world of technology.

Through this website, I aim to provide resources, project showcases, event information, and opportunities for members to collaborate and grow their technical skills. I want the platform to make coding feel approachable for beginners while also giving experienced programmers a place to connect, share ideas, and build exciting projects together.

As development continues, I plan to expand the site's features and content based on community feedback. Ultimately, my vision is for the website to inspire curiosity, foster creativity, and help more people discover the fun and rewarding experience of coding.

The site is a [Next.js](https://nextjs.org) app (`ActualSite/my-app`) deployed to [Cloudflare Workers](https://workers.cloudflare.com/) using the [OpenNext](https://opennext.js.org/cloudflare) adapter. The code runner talks to a public [Judge0](https://judge0.com/) instance through a Next.js API route (`app/api/run`), so there's no separate backend server to run or deploy anymore.

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

The app needs one environment variable, `JUDGE0_URL` (the compiler API it calls). Copy the example below into a new `.env.local` file in `ActualSite/my-app` (this file is git-ignored and never committed):

```bash
JUDGE0_URL=https://ce.judge0.com
```

A `.dev.vars` file with the same value is also used when previewing through Wrangler (see below) — it's git-ignored too.

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
data/        - static problem data
```

When you edit files and save them, the browser will automatically refresh and show your changes.

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
