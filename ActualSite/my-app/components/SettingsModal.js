"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getRunnerSettings,
  saveRunnerSettings,
  lspHttpBase,
  DEFAULT_SETTINGS,
} from "@/lib/runnerSettings";

function TestResult({ state }) {
  if (!state) return null;
  return (
    <span className={`test-connection-result ${state.status}`}>
      {state.message}
    </span>
  );
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export default function SettingsModal({ onClose }) {
  const [form, setForm] = useState(DEFAULT_SETTINGS);
  const [judge0Test, setJudge0Test] = useState(null);
  const [lspTest, setLspTest] = useState(null);

  useEffect(() => {
    setForm(getRunnerSettings());
  }, []);

  useEffect(() => {
    function handleKey(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSave() {
    saveRunnerSettings(form);
    onClose();
  }

  async function testJudge0() {
    setJudge0Test({ status: "pending", message: "Testing…" });
    try {
      const res = await fetchWithTimeout(
        `${form.localJudge0Url.replace(/\/$/, "")}/languages`,
        {
          headers: form.localJudge0Token
            ? { "X-Auth-Token": form.localJudge0Token }
            : {},
        }
      );
      if (res.ok) {
        setJudge0Test({ status: "ok", message: "Connected" });
      } else if (res.status === 401 || res.status === 403) {
        setJudge0Test({ status: "fail", message: "Reachable, but auth token was rejected" });
      } else {
        setJudge0Test({ status: "fail", message: `Reachable, but returned HTTP ${res.status}` });
      }
    } catch {
      setJudge0Test({
        status: "fail",
        message: "Unreachable — check Docker is running and CORS is enabled",
      });
    }
  }

  async function testLsp() {
    setLspTest({ status: "pending", message: "Testing…" });
    const base = lspHttpBase(form.localLspUrl);
    if (!base) {
      setLspTest({ status: "fail", message: "That doesn't look like a valid ws:// URL" });
      return;
    }
    try {
      const res = await fetchWithTimeout(`${base}/health`);
      setLspTest(
        res.ok
          ? { status: "ok", message: "Connected" }
          : { status: "fail", message: `Reachable, but returned HTTP ${res.status}` }
      );
    } catch {
      setLspTest({ status: "fail", message: "Unreachable — is the gateway running?" });
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="run-settings-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="run-settings-title">Run Settings</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close" type="button">
            ×
          </button>
        </div>
        <p className="modal-subtitle">
          Point &quot;Run Code&quot; and IntelliSense at tools running on your own
          laptop instead of our hosted servers. Everything here is saved only
          in this browser.
        </p>

        <div className="settings-section">
          <div className="settings-section-header">
            <span className="settings-section-title">Local Judge0 (code runner)</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={form.useLocalJudge0}
                onChange={(event) => update("useLocalJudge0", event.target.checked)}
              />
              <span className="switch-track" />
            </label>
          </div>
          <p className="settings-section-desc">
            Run submissions against a Judge0 instance in Docker on your own
            machine instead of our server. Visit the{" "}
            <Link href="/resources/local-runner-kit" onClick={onClose}>Resources page</Link> for a ready-to-run
            download.
          </p>

          {form.useLocalJudge0 && (
            <>
              <div className="settings-field">
                <label htmlFor="judge0-url">Judge0 URL</label>
                <input
                  id="judge0-url"
                  type="text"
                  value={form.localJudge0Url}
                  onChange={(event) => update("localJudge0Url", event.target.value)}
                  placeholder="http://localhost:2358"
                />
              </div>
              <div className="settings-field">
                <label htmlFor="judge0-token">Auth token (optional)</label>
                <input
                  id="judge0-token"
                  type="password"
                  value={form.localJudge0Token}
                  onChange={(event) => update("localJudge0Token", event.target.value)}
                  placeholder="Leave blank unless you set AUTHN_TOKEN"
                />
              </div>
              <div className="test-connection-row">
                <button type="button" className="btn-ghost" onClick={testJudge0}>
                  Test connection
                </button>
                <TestResult state={judge0Test} />
              </div>
              <p className="settings-hint">
                Your browser calls this URL directly, so Judge0 needs CORS
                enabled for this site (the bundled docker-compose already
                does this for you).
              </p>
            </>
          )}
        </div>

        <div className="settings-section">
          <div className="settings-section-header">
            <span className="settings-section-title">Local IntelliSense</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={form.useLocalLsp}
                onChange={(event) => update("useLocalLsp", event.target.checked)}
              />
              <span className="switch-track" />
            </label>
          </div>
          <p className="settings-section-desc">
            Get real completions, hovers and diagnostics for Python, C/C++,
            Rust, Go and Java from a language-server gateway running on your
            machine instead of ours.
          </p>

          {form.useLocalLsp && (
            <>
              <div className="settings-field">
                <label htmlFor="lsp-url">Gateway URL</label>
                <input
                  id="lsp-url"
                  type="text"
                  value={form.localLspUrl}
                  onChange={(event) => update("localLspUrl", event.target.value)}
                  placeholder="ws://localhost:3001"
                />
              </div>
              <div className="test-connection-row">
                <button type="button" className="btn-ghost" onClick={testLsp}>
                  Test connection
                </button>
                <TestResult state={lspTest} />
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
