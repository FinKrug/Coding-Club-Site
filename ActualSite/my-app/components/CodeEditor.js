"use client";

// The right-hand side of a challenge page: language picker, Monaco editor
// with IntelliSense, and the Run / Submit buttons. The challenge text itself
// is rendered on the server by app/problems/[id]/page.js.
//
// For challenges with tests:
//   Run Code -> visible tests only (/api/challenges/[id]/run)
//   Submit   -> every test, hidden ones included (/api/challenges/[id]/submit)
// For challenges without tests, Run Code just runs the program as-is.

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { connectLanguageServer } from "@/lib/lspClient";
import { runCode } from "@/lib/judge0Client";
import { getRunnerSettings, subscribeRunnerSettings } from "@/lib/runnerSettings";
import { LANGUAGE_LIST, PRIORITY_MULTIPLIER, pointsFor } from "@/lib/judge/languageList.mjs";
import TestResults from "./TestResults";

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react"),
  {
    ssr: false,
    loading: () => <p>Loading editor...</p>
  }
);

const STATUS_LABELS = {
  "not-applicable": "Built-in IntelliSense active",
  connecting: "IntelliSense: connecting…",
  connected: "IntelliSense: connected",
  disconnected: "IntelliSense: disconnected, retrying…",
  error: "IntelliSense: connection error, retrying…"
};

// Drafts are kept per challenge and language in this browser, so switching
// languages or reloading the page doesn't lose work.
function draftKey(challengeId, languageId) {
  return `ncc:draft:${challengeId}:${languageId}`;
}

function loadDraft(challengeId, languageId) {
  try {
    return window.localStorage.getItem(draftKey(challengeId, languageId));
  } catch {
    return null;
  }
}

function saveDraft(challengeId, languageId, code) {
  try {
    window.localStorage.setItem(draftKey(challengeId, languageId), code);
  } catch {
    // Storage unavailable (private mode etc.): drafts just won't persist.
  }
}

function clearDraft(challengeId, languageId) {
  try {
    window.localStorage.removeItem(draftKey(challengeId, languageId));
  } catch {
    // ignore
  }
}

export default function CodeEditor({
  challengeId,
  hasTests = false,
  starters = {},
  supportedLanguages = null,
  solvedLanguages = [],
  basePoints = 10,
}) {
  const pathname = usePathname();
  // Languages that can't handle this challenge's types are left out entirely.
  const shownLanguages = LANGUAGE_LIST.filter(
    (l) => !hasTests || !supportedLanguages || supportedLanguages.includes(l.id)
  );
  const firstLanguage = (shownLanguages[0] || LANGUAGE_LIST[0]).id;

  const [languageId, setLanguageId] = useState(firstLanguage);
  const [code, setCode] = useState(starters[firstLanguage] || "");
  const [output, setOutput] = useState("");
  const [results, setResults] = useState(null);
  const [points, setPoints] = useState(null);
  const [solved, setSolved] = useState(solvedLanguages);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(null); // "run" | "submit" | null
  const [editorReady, setEditorReady] = useState(false);
  const [lspStatus, setLspStatus] = useState("connecting");
  const [settings, setSettings] = useState(null);

  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  useEffect(() => {
    setSettings(getRunnerSettings());
    return subscribeRunnerSettings(setSettings);
  }, []);

  // Restore this browser's saved draft for the starting language.
  useEffect(() => {
    const saved = loadDraft(challengeId, firstLanguage);
    if (saved !== null) setCode(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeId]);

  const currentLanguage = LANGUAGE_LIST.find((l) => l.id === languageId);

  function handleEditorDidMount(editor, monaco) {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setEditorReady(true);
  }

  useEffect(() => {
    if (!editorReady || !editorRef.current || !monacoRef.current || !settings) return;

    const model = editorRef.current.getModel();
    if (!model) return;

    const lang = currentLanguage?.monaco;
    const gatewayUrl = settings.useLocalLsp ? settings.localLspUrl : undefined;

    const client = connectLanguageServer({
      monaco: monacoRef.current,
      model,
      lang,
      gatewayUrl,
      onStatusChange: setLspStatus
    });

    return () => {
      client.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorReady, languageId, settings?.useLocalLsp, settings?.localLspUrl]);

  function handleCodeChange(value) {
    const next = value || "";
    setCode(next);
    saveDraft(challengeId, languageId, next);
  }

  function clearResults() {
    setResults(null);
    setPoints(null);
    setMessage(null);
  }

  function handleLanguageChange(nextId) {
    setLanguageId(nextId);
    const saved = loadDraft(challengeId, nextId);
    setCode(saved !== null ? saved : starters[nextId] || "");
    clearResults();
  }

  function handleReset() {
    clearDraft(challengeId, languageId);
    setCode(starters[languageId] || "");
    clearResults();
  }

  // Challenges without tests: run the program and show what it prints.
  async function runPlain() {
    setOutput("Running...");
    try {
      const { result } = await runCode({ code, languageId, stdin: "" });
      if (result.compile_output) setOutput(result.compile_output);
      else if (result.stderr) setOutput(result.stderr);
      else if (result.error) setOutput(`Error: ${result.error}${result.details ? `\n\nDetails: ${result.details}` : ""}`);
      else if (result.stdout) setOutput(result.stdout);
      else setOutput("No output.");
    } catch (error) {
      console.error(error);
      setOutput(`Could not connect to compiler server. (${error.message})`);
    }
  }

  async function grade(mode) {
    clearResults();
    try {
      const response = await fetch(`/api/challenges/${challengeId}/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, languageId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage({ kind: data.signIn ? "signin" : "error", text: data.error || "Something went wrong." });
        return;
      }
      setResults({ ...data.result, mode });
      if (data.points) {
        setPoints({ ...data.points, languageId });
        if (data.points.awarded > 0 || data.points.alreadySolved) {
          setSolved((current) => (current.includes(languageId) ? current : [...current, languageId]));
        }
        // Tell the navbar to refresh the point total.
        if (data.points.awarded > 0) window.dispatchEvent(new Event("ncc:points-changed"));
      }
    } catch (error) {
      setMessage({ kind: "error", text: `Could not reach the server. (${error.message})` });
    }
  }

  async function handle(mode) {
    setBusy(mode);
    if (hasTests) await grade(mode);
    else await runPlain();
    setBusy(null);
  }

  return (
    <div className="editor">

      <div className="editor-toolbar">
        <h3>Your Solution</h3>
        {hasTests && starters[languageId] && (
          <button type="button" className="editor-reset" onClick={handleReset} title="Replace your code with the starter code">
            Reset code
          </button>
        )}
      </div>

      <select
        value={languageId}
        onChange={(e) => handleLanguageChange(Number(e.target.value))}
      >
        {shownLanguages.map((language) => (
          <option key={language.id} value={language.id}>
            {language.name}
            {language.priority ? " ★" : ""}
            {hasTests ? ` (${pointsFor(basePoints, language.id)} pts)` : ""}
            {solved.includes(language.id) ? " ✓ solved" : ""}
          </option>
        ))}
      </select>
      <p className="editor-hint">★ Python, Java and C# earn {PRIORITY_MULTIPLIER}× points.</p>

      <div className="monaco-container">
        <MonacoEditor
          height="500px"
          language={currentLanguage?.monaco || "plaintext"}
          value={code}
          onChange={handleCodeChange}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            tabSize: 4,
            wordWrap: "on"
          }}
        />
      </div>

      <div className="runner-status-row">
        <span className="status-pill">
          <span className={`status-dot ${lspStatus}`} />
          <span className="lsp-status">{STATUS_LABELS[lspStatus] || ""}</span>
        </span>
      </div>

      <div className="editor-actions">
        <button
          className={hasTests ? "btn-ghost" : "btn-primary"}
          onClick={() => handle("run")}
          disabled={busy !== null}
        >
          {busy === "run" ? "Running..." : "Run Code"}
        </button>
        {hasTests && (
          <button
            className="btn-primary"
            onClick={() => handle("submit")}
            disabled={busy !== null}
          >
            {busy === "submit" ? "Submitting..." : "Submit"}
          </button>
        )}
      </div>
      {hasTests && (
        <p className="editor-hint">
          Run Code checks the example tests. Submit runs every test, including hidden ones.
        </p>
      )}

      {message && (
        <div className={`grade-message ${message.kind}`}>
          {message.text}{" "}
          {message.kind === "signin" && (
            <a href={`/login?returnTo=${encodeURIComponent(pathname || "/")}`}>Sign in</a>
          )}
        </div>
      )}

      {hasTests ? (
        results && <TestResults results={results} points={points} />
      ) : (
        <div className="output">
          <h3>Output</h3>
          <pre>{output}</pre>
        </div>
      )}

    </div>
  );
}
