# Coding-Club-Site

A collaborative web platform for the Neumont Coding Club, built to help students learn programming, practice problem-solving, and build projects together.

The site is built with [Next.js](https://nextjs.org) (App Router), deployed to [Cloudflare Workers](https://workers.cloudflare.com/) using [OpenNext](https://opennext.js.org/cloudflare), and features in-browser code execution powered by [Judge0](https://judge0.com/) and real-time language server diagnostics powered by `lsp-gateway`.

---

## Quick Start

### 1. Prerequisites
- [Node.js](https://nodejs.org) (LTS version) installed.

### 2. Clone & Install
```bash
git clone https://github.com/FinKrug/Coding-Club-Site.git
cd Coding-Club-Site/ActualSite/my-app
npm install
```

### 3. Configure Environment
Create `.env.local` inside `ActualSite/my-app`:
```bash
cp .env.example .env.local
```
Set the compiler API credentials (ask a maintainer for `JUDGE0_AUTH_TOKEN`):
```bash
JUDGE0_URL=https://judge0.neumontcoding.club
JUDGE0_AUTH_TOKEN=<ask a maintainer>
```

### 4. Run the Dev Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Documentation

Comprehensive guides are available in the [`docs/`](docs/) directory:

- 🚀 **[Getting Started Guide](docs/getting-started.md)**: Step-by-step setup walkthrough, troubleshooting, and dev tips.
- 🏗️ **[Architecture Overview](docs/architecture.md)**: System design, directory structure, and runtime constraints.
- 🔐 **[Authentication & Database](docs/auth-and-database.md)**: MongoDB Atlas setup, Google OAuth, email verification (Resend), and session secrets.
- 🧩 **[Challenges Guide](docs/challenges.md)**: Creating coding challenges, JSON schemas, automated test cases, and self-testing.
- 🏆 **[Points System](docs/points.md)**: Scoring mechanics, language multipliers (1.5× for Python, Java, C#), and point recalculation.
- ☁️ **[Deployment Guide](docs/deployment.md)**: Building and deploying to Cloudflare Workers with OpenNext and Wrangler.
- 💡 **[IntelliSense & Local Tools](docs/intellisense.md)**: Using and configuring the language server gateway (see also [local-dev-tools/README.md](local-dev-tools/README.md)).

---

## Repository Structure

```text
Coding-Club-Site/
├── ActualSite/my-app/     # Next.js web application (App Router)
├── lsp-gateway/          # Language Server Protocol WebSocket gateway
├── local-dev-tools/      # Docker Compose setup for local IntelliSense
└── docs/                 # Detailed guides and technical documentation
```

---

## License & Contributing

Contributions are welcome! Please open an issue or pull request to suggest changes, report bugs, or add new features.
