import { Link } from "react-router-dom";
import problems from "../data/problemData";

const weeks = [
  {
    week: "Week 1",
    challenges: [
      {
        id: 1,
        title: "Reverse String",
        difficulty: "Easy"
      },
      {
        id: 2,
        title: "Two Sum",
        difficulty: "Medium"
      }
    ]
  }
];

function Problems() {
  return (
    <div className="container">
  <h1>Weekly Challenges</h1>

  {weeks.map((week, index) => (
    <div key={index} className="week-card">

      <h2>{week.week}</h2>

      {week.challenges.map((problem) => (
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
  ))}
</div>
  );
}

export default Problems;