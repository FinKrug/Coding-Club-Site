# Getting Started

Welcome! Follow this guide to get the Coding Club website running locally on your computer.

---

## Prerequisites

### Install Node.js

This project uses Next.js, which requires Node.js.

1. Visit [nodejs.org](https://nodejs.org).
2. Download and install the **LTS (Long-Term Support)** version with default settings.
3. Verify your installation by running in your terminal:
   ```bash
   node -v
   npm -v
   ```
   Both commands should output version numbers.

---

## Setup & Local Development

### 1. Download or Clone the Repository

**Option A: Clone with Git**
```bash
git clone https://github.com/FinKrug/Coding-Club-Site.git
cd Coding-Club-Site
```

**Option B: Download ZIP**
1. Open the repository on GitHub.
2. Click **Code** → **Download ZIP**.
3. Extract the ZIP archive onto your computer and open a terminal in the folder.

### 2. Enter the Next.js App Directory

The Next.js website lives in `ActualSite/my-app`, not the repository root:

```bash
cd ActualSite/my-app
```

### 3. Install Dependencies

```bash
npm install
```

This installs all dependencies required by the frontend and backend.

### 4. Configure Environment Variables

Create a `.env.local` file in `ActualSite/my-app`:

```bash
cp .env.example .env.local
```

At minimum, set the Judge0 compiler API endpoint and token:

```bash
JUDGE0_URL=https://judge0.neumontcoding.club
JUDGE0_AUTH_TOKEN=<ask a maintainer>
```

> [!NOTE]
> For accounts, database, and Google sign-in configuration, see [Authentication & Database Guide](auth-and-database.md). The site will run without them, but authentication features will be disabled.

### 5. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The site should now be up and running.

---

## Making Changes

The website source is organized inside `ActualSite/my-app`:

```text
app/         - Pages and API routes (Next.js App Router)
components/  - Shared React UI components
lib/         - Client helpers (runner, IntelliSense) & server helpers (MongoDB, sessions)
data/        - Static resources and starter challenge definitions
```

When you edit files and save them, Next.js hot-reloads the changes automatically in your browser.

---

## Common Problems & Troubleshooting

### `"node is not recognized"`
Node.js is not installed or not in your system `PATH`. Reinstall Node.js from [nodejs.org](https://nodejs.org) and restart your terminal.

### `"npm install" fails`
Try clearing npm cache:
```bash
npm cache clean --force
npm install
```
If errors persist, delete `node_modules` and `package-lock.json`, then re-run `npm install`.

### Port Already In Use
If port `3000` is already in use by another dev server, stop that process or allow Next.js to start on an alternative port when prompted.

---

## Next Steps

- Explore the [Architecture Overview](architecture.md).
- Set up MongoDB and Sign-in with the [Authentication & Database Guide](auth-and-database.md).
- Learn how to add coding problems in the [Challenges Guide](challenges.md).
- Read how points are awarded in the [Points System Guide](points.md).
- Learn how to build and deploy to Cloudflare in the [Deployment Guide](deployment.md).
