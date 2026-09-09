import Link from "next/link";
import problems from "@/data/problemData";

// Groups the flat problems array into the { week, challenges } shape this
// page renders, in first-seen week order. A problem with no `week` field
// falls into "Week 1".
function groupByWeek(items) {
  const weeks = [];
  const weekIndex = new Map();

  for (const problem of items) {
    const label = problem.week || "Week 1";
    if (!weekIndex.has(label)) {
      weekIndex.set(label, weeks.length);
      weeks.push({ week: label, challenges: [] });
    }
    weeks[weekIndex.get(label)].challenges.push(problem);
  }

  return weeks;
}

export default function Problems() {
  const weeks = groupByWeek(problems);

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

              <span className={`difficulty-badge ${problem.difficulty.toLowerCase()}`}>
                {problem.difficulty}
              </span>

              <div>
                <Link href={`/problems/${problem.id}`}>
                  Open Problem →
                </Link>
              </div>
            </div>
          ))}

        </div>
      ))}
    </div>
  );
}
