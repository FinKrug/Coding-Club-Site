# Deployment Guide

The Coding Club site is built with Next.js and deployed to **Cloudflare Workers** using the [@opennextjs/cloudflare](https://opennext.js.org/cloudflare) adapter.

---

## Deployment Prerequisites

1. Install dependencies in `ActualSite/my-app`:
   ```bash
   cd ActualSite/my-app
   npm install
   ```
2. Log in to your Cloudflare account via Wrangler:
   ```bash
   npx wrangler login
   ```

---

## Deploying to Production

Deploy the application:

```bash
npm run deploy
```

This command executes `opennextjs-cloudflare build` followed by `opennextjs-cloudflare deploy`.

---

## Local Production Preview

To test the compiled production worker locally inside the real Cloudflare Workers runtime (Miniflare/workerd) before deploying:

```bash
npm run preview
```

The preview will start locally (typically at `http://localhost:8787`). Ensure `.dev.vars` contains any required environment secrets when running in preview mode.

---

## Managing Environment Variables & Secrets

### Public Variables
Public and non-secret configuration settings (e.g. `JUDGE0_URL`, `EMAIL_FROM`, `GOOGLE_SIGNIN_ENABLED`) are defined in:
- `ActualSite/my-app/wrangler.jsonc` under the `vars` object.
- Or configured directly in the Cloudflare Dashboard under **Workers & Pages** → *Your Worker* → **Settings** → **Variables and Secrets**.

### Production Secrets
Sensitive credentials must **never** be committed to Git or stored in `wrangler.jsonc`. Set them securely using the Wrangler CLI from `ActualSite/my-app`:

```bash
npx wrangler secret put MONGODB_URI
npx wrangler secret put SESSION_SECRET
npx wrangler secret put PASSWORD_PEPPER
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

---

## Automatic Git Deployments (CI/CD)

You can link this GitHub repository directly to Cloudflare:
1. In the Cloudflare Dashboard, go to **Workers & Pages** → **Create** → **Pages/Workers** → **Connect to Git**.
2. Select your repository and configure the build settings:
   - Root directory: `ActualSite/my-app`
   - Build command: `npx @opennextjs/cloudflare build`
   - Output directory: `.worker-next`
3. Configure your production secrets and environment variables in the project settings.
4. Future pushes to the `main` branch will automatically trigger builds and deployments.
