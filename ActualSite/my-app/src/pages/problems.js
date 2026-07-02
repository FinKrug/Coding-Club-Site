import { Link } from "react-router-dom";
import problems from "../data/problemData";

function Problems() {
  return (
    <div className="container">

      <h1>Challenges</h1>

      {problems.map(problem => (
        <div
          key={problem.id}
          className="problem-card"
        >

          <h3>{problem.title}</h3>

          <p>{problem.difficulty}</p>

          <Link to={`/problems/${problem.id}`}>
            Open Problem
          </Link>

        </div>
      ))}

    </div>
  );
}

export default Problems;