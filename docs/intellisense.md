# IntelliSense & Local Development Tools

The Coding Club site provides IDE-grade language features inside its Monaco code editor, including real-time autocomplete, hovers, and diagnostics across Python, C, C++, Rust, Go, and Java.

---

## How It Works

1. **Monaco Editor Client**: Runs in the user's browser inside `ActualSite/my-app`.
2. **`lsp-gateway` Service**: A WebSocket gateway that manages processes for underlying language servers (such as `pyright`, `clangd`, `rust-analyzer`, `gopls`, and `jdtls`).
3. **Hosted Gateway**: By default, the website connects to a hosted instance of `lsp-gateway`.

---

## Running IntelliSense Locally

Users can opt to run their own local language server gateway if working offline or developing custom features.

### Quick Start via Resources Page
The website's **Resources** page (`/resources`) provides a single-click zip download containing:
- Pre-configured `docker-compose.yml`
- The `lsp-gateway` source code
- Full setup instructions

The downloadable bundle is automatically packaged from `local-dev-tools/` and `lsp-gateway/` by `ActualSite/my-app/scripts/build-local-dev-tools-zip.js` prior to every build and deployment.

### Running from the Repository
If you have cloned the repository, navigate to `local-dev-tools/`:

```bash
cd local-dev-tools
docker compose up --build
```

The gateway will start on `ws://localhost:3001`. In the website UI, open the **Run Settings** modal (gear icon in the navigation bar) and toggle **Local IntelliSense** on.

For detailed Docker Compose setup instructions and troubleshooting, see [local-dev-tools/README.md](../local-dev-tools/README.md).

---

## Note on Judge0 (Code Execution)

> [!IMPORTANT]
> Local development tools bundle **IntelliSense only**. The code execution runner (Judge0) cannot be run locally under Docker on Windows.
>
> Judge0's sandboxing mechanism relies on Linux cgroup v1. As of **WSL 2.5.1**, Microsoft made cgroup v2 mandatory and removed the ability to revert to cgroup v1. Consequently, Judge0 cannot run within Docker Desktop or Docker Engine on Windows WSL2.
>
> For this reason, "Run Code" and "Submit" always route to the hosted Judge0 cluster, even when using local IntelliSense.
