# Running the code runner + IntelliSense locally

This folder gives you a local copy of the two backend pieces the site
normally hosts for you:

- **Judge0** — the sandbox that actually compiles and runs submitted code.
- **lsp-gateway** — the language-server backend behind "IntelliSense"
  (real completions/diagnostics for Python, C, C++, Rust, Go and Java).

Run them on your own laptop, then flip the matching toggles in the site's
**Run Settings** (the gear icon in the navbar) to point the site at your
machine instead of the hosted servers. Nothing here is required to use the
site normally — this is only for people who want to run their own compiler
backend, e.g. because they're offline, want to submit untrusted code they'd
rather not send to someone else's server, or are hacking on the runner
itself.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or
  Docker Engine + Compose on Linux), with at least ~4 GB of free RAM given
  to Docker and a few GB of free disk space — the IntelliSense image bundles
  a JDK, a Go toolchain, and clangd, so the first build is a few hundred MB
  to a couple GB depending on what's already cached.
- On Windows, plain Command Prompt or PowerShell is fine — as long as
  Docker Desktop is set to its default **WSL2-based engine** (Settings →
  General → "Use the WSL 2 based engine"), it already runs every container
  inside a real Linux VM regardless of which terminal you type `docker`
  into, and Judge0 needs that real Linux kernel underneath for its cgroup
  sandboxing (via a tool called `isolate`). This only becomes something to
  check if Docker Desktop has been switched to the older Hyper-V backend —
  switch it back to WSL2 in that case.

## 1. Start everything

From this `local-dev-tools` folder:

```bash
docker compose up -d --build
```

The first run will take a while: it builds the IntelliSense image (installs
a JDK, Go, clangd, downloads rust-analyzer and the Eclipse JDT Language
Server) and pulls the Judge0/Postgres/Redis images. Later runs are much
faster.

Judge0's workers take 15-30 seconds after startup to actually come online.
Check everything is healthy with:

```bash
docker compose ps
curl http://localhost:2358/languages
curl http://localhost:3001/health
```

If the first `curl` hangs or errors, give it a few more seconds and try
again.

## 2. Point the site at it

On the site, click the gear icon (**Run Settings**) in the navbar:

- Turn on **Local Judge0**. The URL defaults to `http://localhost:2358`,
  which matches this compose file — leave it as-is. Leave the auth token
  blank (this local setup has authentication disabled).
- Turn on **Local IntelliSense**. The URL defaults to `ws://localhost:3001`,
  which also matches this compose file.
- Use the **Test connection** button next to each — it should say
  "Connected" for both once the containers are up.

These settings are saved per-browser (localStorage), so they won't affect
anyone else visiting the site.

## 3. Stop everything

```bash
docker compose down
```

Add `-v` if you also want to drop the Postgres data volume (Judge0 doesn't
keep anything you'd miss between runs; this is a cache, not a database of
your work).

## How the pieces fit together

- The site's browser code, not its server, talks to your local Judge0 and
  lsp-gateway directly — the site is deployed to Cloudflare Workers, which
  has no way to reach "localhost" on your laptop, so this can't go through
  the site's own server the way the hosted mode does.
- Judge0 allows cross-origin requests from any origin by default (that's
  Judge0's own `ALLOW_ORIGIN` setting, left blank in `judge0.conf`), which
  is what lets the site's frontend call `http://localhost:2358` directly.
- `lsp-gateway`'s Dockerfile (in `../lsp-gateway/Dockerfile`) is the same
  gateway the hosted site uses at `lsp.neumontcoding.club`
  (see `../lsp-gateway/server.js`), just packaged with every language
  server it needs pre-installed.

## Troubleshooting

**`docker compose up` fails on the `server` or `worker` container, or code
never finishes running.** Check `docker compose logs server worker`. Judge0
needs `privileged: true` (already set here) to set up its sandbox; on some
Linux hosts running a cgroup v2-only kernel you may need to switch Docker to
cgroup v1 compatibility mode — see the "Isolate" and "Cgroups" sections of
the [Judge0 documentation](https://github.com/judge0/judge0) if you hit
this.

**Run Code says "Could not reach your local Judge0."** Make sure
`docker compose ps` shows `server` as running, then check
`http://localhost:2358/languages` loads directly in your browser. A
Docker Desktop restart or a port already in use (something else on 2358)
are the usual culprits.

**Run Settings says the local IntelliSense gateway is "Unreachable" even
though `docker compose ps` shows it running.** Two separate causes are worth
checking: first, some Chrome versions now show a one-time "allow this site
to access your local network?" permission prompt (called Local Network
Access) the first time a page tries to reach `localhost` — look for it (or
a padlock/site-settings icon) and allow it. Second, if that's already
allowed and it's still failing, make sure `http://localhost:3001/health`
loads directly in your browser — if it does but the site's Test Connection
button still fails, the gateway likely needs rebuilding
(`docker compose up -d --build lsp-gateway`) to pick up a fix.

**IntelliSense says "connection error" or never leaves "connecting…".**
Check `docker compose logs lsp-gateway`. The most common cause is the
per-language server itself failing to start inside the container — the
gateway logs which one and why (e.g. `[python stderr] ...`).

**A specific language's IntelliSense doesn't work but others do.** Each
language spawns its own process on demand (pyright, clangd, rust-analyzer,
gopls, or the JDT Language Server for Java) — a build hiccup with one of
them doesn't affect the others. Rebuilding
(`docker compose up -d --build lsp-gateway`) after checking the Dockerfile
usually fixes a one-off install failure.
