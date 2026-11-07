import test from "node:test";
import assert from "node:assert/strict";
import { lspHttpBase, DEFAULT_SETTINGS } from "../../lib/runnerSettings.js";

test("runnerSettings.js - DEFAULT_SETTINGS values", () => {
  assert.equal(DEFAULT_SETTINGS.useLocalLsp, false);
  assert.equal(DEFAULT_SETTINGS.localLspUrl, "ws://localhost:3001");
});

test("runnerSettings.js - lspHttpBase conversion", () => {
  assert.equal(lspHttpBase("ws://localhost:3001"), "http://localhost:3001");
  assert.equal(lspHttpBase("ws://localhost:3001/"), "http://localhost:3001");
  assert.equal(lspHttpBase("ws://localhost:3001/subpath?arg=1"), "http://localhost:3001");
  assert.equal(lspHttpBase("wss://lsp.neumontcoding.club"), "https://lsp.neumontcoding.club");
  assert.equal(lspHttpBase("wss://lsp.neumontcoding.club/ws"), "https://lsp.neumontcoding.club");
  assert.equal(lspHttpBase("not a url"), null);
});
