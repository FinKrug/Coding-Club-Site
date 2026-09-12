# Running IntelliSense locally

This folder gives you a local copy of the language-server backend behind
this site's "IntelliSense" — real completions, hovers and diagnostics for
Python, C, C++, Rust, Go and Java, powered by `lsp-gateway`.

Run it on your own laptop, then flip the **Local IntelliSense** toggle in
the site's **Run Settings** (the gear icon in the navbar) to point the
site at your machine instead of our hosted gateway. Nothing here is
required to use the site normally — this is only for people who want to
run their own IntelliSense backend, e.g. because they're offline or are
hacking on the gateway itself.

> **Where did local Judge0 (the code runner) go?** An earlier version of
> this bundle also let you self-host Judge0, the sandbox that actually
> runs submitted code, alongside IntelliSense. That's been removed:
> Judge0's sandboxing needs the legacy cgroup v1 hierarchy, and as of
> **WSL version 2.5.1** Microsoft made cgroup v2 the mandatory baseline for
> all of WSL2 and removed the ability to switch back — confirmed by
> testing it directly, kernel flag and all (see
> [spurin/wsl-cgroupsv2](https://github.com/spurin/wsl-cgroupsv2)). So it
> genuinely can't run under Docker on Windows anymore, whether that's
> Docker Desktop or a Docker Engine installed directly inside a WSL2
> distro — there's no cgroup v1 left on WSL2 to switch into at all (see
> also [judge0/judge0#583](https://github.com/judge0/judge0/issues/583)
> for the same conclusion from the Judge0 side). **"Run Code" on the site
> always uses our hosted Judge0 now.** This is entirely unrelated to
> IntelliSense — it doesn't use `isolate` or cgroups at all — so it works
> the same as always.
>
> If you're on Mac or native Linux and specifically want to self-host
> Judge0 too, the official [judge0/judge0](https://github.com/judge0/judge0)
> repo's own Docker Compose setup works unmodified there (cgroup v1 is
> still available on those platforms); it's just no longer bundled here
> since this kit is meant to work the same way for everyone, including
> the many people running Windows.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or
  Docker Engine + Compose on Linux), with a bit of free RAM and disk
  space — this image bundles a JDK, a Go toolchain, and clangd, so the
  first build is a few hundred MB to a couple GB depending on what's
  already cached.

## 1. Start it

From this `local-dev-tools` folder:

```bash
docker compose up -d --build
```

The first run will take a while: it installs a JDK, Go, clangd, downloads
rust-analyzer and the Eclipse JDT Language Server. Later runs are much
faster.

Check it's healthy with:

```bash
docker compose ps
curl http://localhost:3001/health
```

## 2. Point the site at it

On the site, click the gear icon (**Run Settings**) in the navbar:

- Turn on **Local IntelliSense**. The URL defaults to `ws://localhost:3001`,
  which matches this compose file.
- Use the **Test connection** button — it should say "Connected" once the
  container is up.

This setting is saved per-browser (localStorage), so it won't affect
anyone else visiting the site.

## 3. Stop it

```bash
docker compose down
```

## How it fits together

- The site's browser code, not its server, talks to your local gateway
  directly — the site is deployed to Cloudflare Workers, which has no way
  to reach "localhost" on your laptop, so this can't go through the
  site's own server the way the hosted mode does.
- `lsp-gateway`'s Dockerfile (in `../lsp-gateway/Dockerfile`) is the same
  gateway the hosted site uses at `lsp.neumontcoding.club` (see
  `../lsp-gateway/server.js`), just packaged with every language server it
  needs pre-installed.

## Troubleshooting

**Run Settings says the local IntelliSense gateway is "Unreachable" even
though `docker compose ps` shows it running.** Two separate causes are
worth checking: first, some Chrome versions now show a one-time "allow
this site to access your local network?" permission prompt (called Local
Network Access) the first time a page tries to reach `localhost` — look
for it (or a padlock/site-settings icon) and allow it. Second, if that's
already allowed and it's still failing, make sure
`http://localhost:3001/health` loads directly in your browser — if it
does but the site's Test Connection button still fails, the gateway
likely needs rebuilding (`docker compose up -d --build`) to pick up a fix.
If you're on an old copy of this bundle, grab a fresh download from
`/resources` first — CORS support for this health check was a real fix
made after an earlier release.

**IntelliSense connects, but then keeps dropping and reconnecting in the
code editor.** Check `docker compose logs lsp-gateway` — it'll show which
language server actually failed and why, or reveal a gateway crash. If
you're on an old copy of this bundle, grab a fresh download from
`/resources` — a real crash bug here (a startup race in the gateway's
idle-timeout logic) was fixed after an earlier release.

**IntelliSense says "connection error" or never leaves "connecting…".**
Check `docker compose logs lsp-gateway`. The most common cause is the
per-language server itself failing to start inside the container — the
gateway logs which one and why (e.g. `[python stderr] ...`).

**A specific language's IntelliSense doesn't work but others do.** Each
language spawns its own process on demand (pyright, clangd,
rust-analyzer, gopls, or the JDT Language Server for Java) — a build
hiccup with one of them doesn't affect the others. Rebuilding
(`docker compose up -d --build`) after checking the Dockerfile usually
fixes a one-off install failure.
