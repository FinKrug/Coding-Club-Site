"use client";

import { useParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import problems from "@/data/problemData";
import { connectLanguageServer } from "@/lib/lspClient";
import { runCode } from "@/lib/judge0Client";
import { getRunnerSettings, subscribeRunnerSettings } from "@/lib/runnerSettings";

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react"),
  {
    ssr: false,
    loading: () => <p>Loading editor...</p>
  }
);

const languages = [
  { id: 71, name: "Python 3", monacoLanguage: "python" },
  { id: 63, name: "JavaScript", monacoLanguage: "javascript" },
  { id: 62, name: "Java", monacoLanguage: "java" },
  { id: 54, name: "C++", monacoLanguage: "cpp" },
  { id: 50, name: "C", monacoLanguage: "c" },
  { id: 73, name: "Rust", monacoLanguage: "rust" },
  { id: 60, name: "Go", monacoLanguage: "go" },
  { id: 74, name: "TypeScript", monacoLanguage: "typescript" }
];

const STATUS_LABELS = {
  "not-applicable": "Built-in IntelliSense active",
  connecting: "IntelliSense: connecting…",
  connected: "IntelliSense: connected",
  disconnected: "IntelliSense: disconnected, retrying…",
  error: "IntelliSense: connection error, retrying…"
};

export default function ProblemPage() {
  const { id } = useParams();

  const problem = problems.find(
    p => p.id === Number(id)
  );

  const [code, setCode] = useState("");
  const [languageId, setLanguageId] = useState(71);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [lspStatus, setLspStatus] = useState("connecting");
  const [settings, setSettings] = useState(null);

  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  useEffect(() => {
    setSettings(getRunnerSettings());
    return subscribeRunnerSettings(setSettings);
  }, []);

  if (!problem) {
    return <h2>Problem Not Found</h2>;
  }

  const currentLanguage = languages.find(
    l => l.id === languageId
  );

  function handleEditorDidMount(editor, monaco) {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setEditorReady(true);
  }

  useEffect(() => {
    if (!editorReady || !editorRef.current || !monacoRef.current || !settings) return;

    const model = editorRef.current.getModel();
    if (!model) return;

    const lang = currentLanguage?.monacoLanguage;
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

  async function handleRun() {
    setLoading(true);
    setOutput("Running...");

    try {
      const { result } = await runCode({
        code,
        languageId,
        stdin: ""
      });

      if (result.compile_output) {
        setOutput(result.compile_output);
      } else if (result.stderr) {
        setOutput(result.stderr);
      } else if (result.error) {
        setOutput(
          `Error: ${result.error}${result.details ? `\n\nDetails: ${result.details}` : ""}`
        );
      } else if (result.stdout) {
        setOutput(result.stdout);
      } else {
        setOutput(`No output. (raw response: ${JSON.stringify(result)})`);
      }

    } catch (error) {
      console.error(error);

      setOutput(
        `Could not connect to compiler server. (${error.message})`
      );
    }

    setLoading(false);
  }

  return (
    <div className="problem-layout">

      <div className="problem-description">

        <h1>{problem.title}</h1>

        <span className={`difficulty-badge ${problem.difficulty.toLowerCase()}`}>
          {problem.difficulty}
        </span>

        <p>{problem.description}</p>

        <h3>Example</h3>

        {problem.examples.map((example, index) => (
          <div key={index}>

            <p>
              <strong>Input:</strong>{" "}
              {example.input}
            </p>

            <p>
              <strong>Output:</strong>{" "}
              {example.output}
            </p>

          </div>
        ))}

      </div>

      <div className="editor">

        <h3>Your Solution</h3>

        <select
          value={languageId}
          onChange={(e) =>
            setLanguageId(Number(e.target.value))
          }
        >

          {languages.map((language) => (
            <option
              key={language.id}
              value={language.id}
            >
              {language.name}
            </option>
          ))}

        </select>

        <div className="monaco-container">
          <MonacoEditor
            height="500px"
            language={currentLanguage?.monacoLanguage || "plaintext"}
            value={code}
            onChange={(value) => setCode(value || "")}
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

        <button
          className="btn-primary"
          onClick={handleRun}
          disabled={loading}
        >
          {loading ? "Running..." : "Run Code"}
        </button>

        <div className="output">

          <h3>Output</h3>

          <pre>
            {output}
          </pre>

        </div>

      </div>

    </div>
  );
}
