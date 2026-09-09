#!/usr/bin/env node
// Bundles local-dev-tools/ (the Docker Compose setup for running Judge0 +
// IntelliSense on your own machine) plus the lsp-gateway source it builds,
// into public/downloads/local-dev-tools.zip so the Resources page can offer
// a single download instead of "go clone our whole repo".
//
// Runs automatically before dev/build/preview/deploy (see package.json) so
// the download always matches the current source. Pure Node, no extra
// dependencies — writes an uncompressed (STORE method) zip, which is fine
// since everything in it is small text.

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const localDevTools = path.join(repoRoot, "local-dev-tools");
const lspGatewayDir = path.join(repoRoot, "lsp-gateway");
const outDir = path.join(__dirname, "..", "public", "downloads");
const outFile = path.join(outDir, "local-dev-tools.zip");

function rewriteComposePath(content) {
  // Inside the zip, lsp-gateway ships as a sibling folder (./lsp-gateway)
  // rather than one directory up (../lsp-gateway, which is where it lives
  // relative to local-dev-tools/ inside the actual git repo).
  return content.replace("context: ../lsp-gateway", "context: ./lsp-gateway");
}

const SOURCES = [
  { zipPath: "docker-compose.yml", src: path.join(localDevTools, "docker-compose.yml"), rewrite: rewriteComposePath },
  { zipPath: "judge0.conf", src: path.join(localDevTools, "judge0.conf") },
  { zipPath: "README.md", src: path.join(localDevTools, "README.md") },
  { zipPath: "lsp-gateway/Dockerfile", src: path.join(lspGatewayDir, "Dockerfile") },
  { zipPath: "lsp-gateway/package.json", src: path.join(lspGatewayDir, "package.json") },
  { zipPath: "lsp-gateway/server.js", src: path.join(lspGatewayDir, "server.js") },
  { zipPath: "lsp-gateway/.dockerignore", src: path.join(lspGatewayDir, ".dockerignore") },
];

function crc32(buf) {
  if (typeof zlib.crc32 === "function") {
    return zlib.crc32(buf) >>> 0;
  }
  // Fallback for Node versions before crc32 landed in zlib (v21).
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Minimal ZIP writer (local headers + central directory + EOCD), STORE
// (uncompressed) method only. Every consumer of this file is either a text
// editor or `docker compose`, so we don't need DEFLATE.
function buildZip(fileEntries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const DOS_DATE = 0x21; // 1980-01-01 — fixed timestamp, this is a generated bundle.
  const DOS_TIME = 0x00;

  for (const { zipPath, data } of fileEntries) {
    const nameBuf = Buffer.from(zipPath, "utf-8");
    const crc = crc32(data);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(DOS_TIME, 10);
    localHeader.writeUInt16LE(DOS_DATE, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, nameBuf, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(DOS_TIME, 12);
    centralHeader.writeUInt16LE(DOS_DATE, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, nameBuf);

    offset += localHeader.length + nameBuf.length + data.length;
  }

  const centralDirStart = offset;
  const centralDirBuf = Buffer.concat(centralParts);

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(fileEntries.length, 8);
  end.writeUInt16LE(fileEntries.length, 10);
  end.writeUInt32LE(centralDirBuf.length, 12);
  end.writeUInt32LE(centralDirStart, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirBuf, end]);
}

function main() {
  const missing = SOURCES.filter((s) => !fs.existsSync(s.src));
  if (missing.length) {
    console.warn(
      "build-local-dev-tools-zip: skipping, missing source file(s):\n" +
        missing.map((s) => `  - ${s.src}`).join("\n")
    );
    return;
  }

  const fileEntries = SOURCES.map(({ zipPath, src, rewrite }) => {
    let data = fs.readFileSync(src);
    if (rewrite) data = Buffer.from(rewrite(data.toString("utf-8")), "utf-8");
    return { zipPath, data };
  });

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, buildZip(fileEntries));
  console.log(`build-local-dev-tools-zip: wrote ${path.relative(repoRoot, outFile)} (${fileEntries.length} files)`);
}

main();
