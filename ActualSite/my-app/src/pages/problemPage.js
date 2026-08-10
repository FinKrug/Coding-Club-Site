import { useParams } from "react-router-dom";
import { useState } from "react";
import problems from "../data/problemData";

const languages = [
  { id: 71, name: "Python 3" },
  { id: 63, name: "JavaScript" },
  { id: 62, name: "Java" },
  { id: 54, name: "C++" },
  { id: 50, name: "C" },
  { id: 73, name: "Rust" },
  { id: 60, name: "Go" },
  { id: 74, name: "TypeScript" }
];

function ProblemPage() {
  const { id } = useParams();

  const problem = problems.find(
    p => p.id === Number(id)
  );

  const [code, setCode] = useState("");
  const [languageId, setLanguageId] = useState(71);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  if (!problem) {
    return <h2>Problem Not Found</h2>;
  }

  async function runCode() {
    setLoading(true);
    setOutput("Running...");

    try {
      const response = await fetch(
        "http://localhost:5000/run",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            code,
            languageId,
            stdin: ""
          })
        }
      );

      const result = await response.json();

      if (result.compile_output) {
        setOutput(result.compile_output);
      } else if (result.stderr) {
        setOutput(result.stderr);
      } else {
        setOutput(result.stdout || "No output.");
      }

    } catch (error) {
      console.error(error);

      setOutput(
        "Could not connect to compiler server."
      );
    }

    setLoading(false);
  }

  return (
    <div className="problem-layout">

      <div className="problem-description">

        <h1>{problem.title}</h1>

        <span>
          Difficulty: {problem.difficulty}
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

        <textarea
          rows="20"
          value={code}
          onChange={(e) =>
            setCode(e.target.value)
          }
          placeholder="Write your solution here..."
        />

        <button
          onClick={runCode}
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

export default ProblemPage;