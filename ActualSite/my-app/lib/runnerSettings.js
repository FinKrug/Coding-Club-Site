"use client";

// Client-side "bring your own backend" preferences. Everything here lives in
// localStorage on the visitor's own machine — nothing is sent to our
// server. Components read the current value with getRunnerSettings() and
// react to changes (from the settings modal, in any tab) by subscribing
// with subscribeRunnerSettings().
//
// This used to also cover a "Local Judge0" option (self-hosted code
// runner), removed because Judge0's sandboxing needs the legacy cgroup v1
// hierarchy, which WSL2 no longer supports as of WSL version 2.5.1 — see
// local-dev-tools/README.md. "Run Code" always uses our hosted Judge0 now;
// only IntelliSense has a local option.

const STORAGE_KEY = "neumont-cc-runner-settings";
const EVENT_NAME = "neumont-cc-runner-settings-changed";

export const DEFAULT_SETTINGS = {
  useLocalLsp: false,
  localLspUrl: "ws://localhost:3001",
};

export function getRunnerSettings() {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveRunnerSettings(next) {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  const merged = { ...getRunnerSettings(), ...next };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // Storage might be unavailable (private browsing, quota, etc). The
    // in-memory settings still get broadcast below so the UI stays
    // consistent for the rest of this page load.
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: merged }));
  return merged;
}

export function subscribeRunnerSettings(callback) {
  if (typeof window === "undefined") return () => {};
  const handler = (event) => callback(event.detail || getRunnerSettings());
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}

// Turns a ws://host:port or wss://host:port gateway URL into the matching
// http(s) origin, for hitting the gateway's plain HTTP /health endpoint.
export function lspHttpBase(lspWsUrl) {
  try {
    const url = new URL(lspWsUrl);
    url.protocol = url.protocol === "wss:" ? "https:" : "http:";
    url.pathname = "";
    url.search = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}
