import { useParams } from "react-router-dom";
import problems from "../data/problemData";

function ProblemPage() {

  const { id } = useParams();

  const problem = problems.find(
    p => p.id === Number(id)
  );

  if (!problem) {
    return <h2>Problem Not Found</h2>;
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

        <textarea
          rows="20"
          placeholder="Write your solution here..."
        />

        <button>
          Submit
        </button>

      </div>

    </div>
  );
}

export default ProblemPage;