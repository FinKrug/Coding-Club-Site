// LSP gateway: bridges browser WebSocket connections (from Monaco via
// monaco-languageclient) to real, server-side language server processes.
//
// One WebSocket connection = one language server child process = one
// throwaway workspace directory. JS/TS are NOT handled here since Monaco's
// built-in language service already covers those in-browser for free.

const http = require("http");
const { WebSocketServer } = require("ws");
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.LSP_GATEWAY_PORT || 3001;
const MAX_CONCURRENT_SESSIONS = parseInt(process.env.LSP_MAX_SESSIONS || "6", 10);
const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes of inactivity kills the session

let activeSessions = 0;

const LANGUAGE_CONFIG = {
  python: {
    command: "pyright-langserver",
    args: ["--stdio"],
    fileName: "main.py"
  },
  c: {
    command: "clangd",
    args: [],
    fileName: "main.c"
  },
  cpp: {
    command: "clangd",
    args: [],
    fileName: "main.cpp"
  },
  rust: {
    command: "rust-analyzer",
    args: [],
    fileName: "main.rs"
  },
  go: {
    command: "gopls",
    args: ["serve"],
    fileName: "main.go"
  },
  java: {
    command: "java",
    // args are built per-session in spawnServer() below since jdtls needs a
    // per-session -data workspace directory appended at spawn time.
    args: null,
    fileName: "Main.java"
  }
};

function buildJavaArgs(workspaceDataDir) {
  const jdtlsHome = process.env.JDTLS_HOME || "/opt/jdtls";
  const pluginsDir = path.join(jdtlsHome, "plugins");
  const launcherJar = fs
    .readdirSync(pluginsDir)
    .find((f) => f.startsWith("org.eclipse.equinox.launcher_"));

  if (!launcherJar) {
    throw new Error(`Could not find equinox launcher jar in ${pluginsDir}`);
  }

  return [
    "-Declipse.application=org.eclipse.jdt.ls.core.id1",
    "-Dosgi.bundles.defaultStartLevel=4",
    "-Declipse.product=org.eclipse.jdt.ls.core.product",
    "-Dlog.level=ERROR",
    "-noverify",
    "-Xmx512m",
    "-jar",
    path.join(pluginsDir, launcherJar),
    "-configuration",
    path.join(jdtlsHome, "config_linux"),
    "-data",
    workspaceDataDir
  ];
}

function createWorkspace(lang) {
  const config = LANGUAGE_CONFIG[lang];
  const sessionId = crypto.randomUUID();
  const workspaceDir = path.join(os.tmpdir(), "lsp-sessions", sessionId);
  fs.mkdirSync(workspaceDir, { recursive: true });
  fs.writeFileSync(path.join(workspaceDir, config.fileName), "");
  return workspaceDir;
}

function spawnServer(lang, workspaceDir) {
  const config = LANGUAGE_CONFIG[lang];

  let args;
  if (lang === "java") {
    const dataDir = path.join(workspaceDir, ".jdt-data");
    fs.mkdirSync(dataDir, { recursive: true });
    args = buildJavaArgs(dataDir);
  } else {
    args = [...config.args];
  }

  return spawn(config.command, args, {
    cwd: workspaceDir,
    env: process.env
  });
}

function frameMessage(jsonString) {
  const contentLength = Buffer.byteLength(jsonString, "utf-8");
  return `Content-Length: ${contentLength}\r\n\r\n${jsonString}`;
}

// Parses a stream of LSP's Content-Length-framed messages out of raw stdout
// chunks (which don't necessarily align with message boundaries), calling
// onMessage(jsonString) once per complete message.
function createStdioParser(onMessage) {
  let buffer = Buffer.alloc(0);

  return function feed(chunk) {
    buffer = Buffer.concat([buffer, chunk]);

    while (true) {
      const headerEnd = buffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) return;

      const header = buffer.slice(0, headerEnd).toString("utf-8");
      const match = header.match(/Content-Length: (\d+)/i);
      if (!match) {
        buffer = Buffer.alloc(0); // malformed, drop to avoid an infinite loop
        return;
      }

      const contentLength = parseInt(match[1], 10);
      const messageStart = headerEnd + 4;

      if (buffer.length < messageStart + contentLength) return; // wait for more

      const messageBody = buffer
        .slice(messageStart, messageStart + contentLength)
        .toString("utf-8");
      buffer = buffer.slice(messageStart + contentLength);

      onMessage(messageBody);
    }
  };
}

function cleanupWorkspace(workspaceDir) {
  fs.rm(workspaceDir, { recursive: true, force: true }, (err) => {
    if (err) console.error("Failed to clean up workspace:", err);
  });
}

const server = http.createServer((req, res) => {
  // Simple health check so we can confirm the gateway is up without a
  // WebSocket client.
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", activeSessions }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const lang = url.searchParams.get("lang");

  if (!LANGUAGE_CONFIG[lang]) {
    ws.close(1008, `Unsupported language: ${lang}`);
    return;
  }

  if (activeSessions >= MAX_CONCURRENT_SESSIONS) {
    ws.close(1013, "Server busy, please try again shortly.");
    return;
  }

  activeSessions++;

  const workspaceDir = createWorkspace(lang);
  let child;

  try {
    child = spawnServer(lang, workspaceDir);
  } catch (err) {
    console.error(`Failed to spawn language server for ${lang}:`, err);
    ws.close(1011, "Failed to start language server.");
    activeSessions--;
    cleanupWorkspace(workspaceDir);
    return;
  }

  let idleTimer = resetIdleTimer();

  function resetIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    return setTimeout(() => {
      console.log(`Idle timeout for ${lang} session, closing.`);
      ws.close(1000, "Idle timeout");
    }, IDLE_TIMEOUT_MS);
  }

  const feedStdout = createStdioParser((jsonString) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(jsonString);
    }
  });

  child.stdout.on("data", feedStdout);
  child.stderr.on("data", (data) => {
    console.error(`[${lang} stderr]`, data.toString());
  });

  child.on("exit", (code, signal) => {
    console.log(`Language server for ${lang} exited (code=${code}, signal=${signal})`);
    if (ws.readyState === ws.OPEN) {
      ws.close(1011, "Language server exited.");
    }
  });

  ws.on("message", (data) => {
    idleTimer = resetIdleTimer();
    const jsonString = data.toString("utf-8");
    child.stdin.write(frameMessage(jsonString));
  });

  ws.on("close", () => {
    clearTimeout(idleTimer);
    activeSessions--;
    try {
      child.kill();
    } catch (err) {
      // already dead, ignore
    }
    cleanupWorkspace(workspaceDir);
  });

  ws.on("error", (err) => {
    console.error(`WebSocket error for ${lang} session:`, err);
  });
});

server.listen(PORT, () => {
  console.log(`LSP gateway listening on port ${PORT}`);
  console.log(`Max concurrent sessions: ${MAX_CONCURRENT_SESSIONS}`);
});
