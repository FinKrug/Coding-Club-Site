import Link from "next/link";
import { getNextRelease, listChallenges } from "@/lib/challenges";
import { formatMeetingDate } from "@/lib/meetings";
import { getSession } from "@/lib/session";
import { getSolvedLanguages } from "@/lib/points";

export const dynamic = "force-dynamic";

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

export default async function Problems() {
  let problems;
  try {
    problems = await listChallenges();
  } catch (error) {
    console.error("Failed to load challenges:", error);
    return (
      <div className="container">
        <h1>Weekly Challenges</h1>
        <p>We couldn&apos;t load the challenges right now. Please try again in a moment.</p>
      </div>
    );
  }

  const weeks = groupByWeek(problems);

  // "Week 3 unlocks Monday, Oct 19" teaser for the next locked week.
  let nextRelease = null;
  try {
    nextRelease = await getNextRelease();
  } catch (error) {
    console.error("Failed to load the release schedule:", error);
  }

  // Signed-in members see a checkmark on challenges they've solved.
  let solved = new Map();
  const session = await getSession();
  if (session) {
    try {
      solved = await getSolvedLanguages(session.userId);
    } catch (error) {
      console.error("Failed to load solves:", error);
    }
  }

  return (
    <div className="container">
      <h1>Weekly Challenges</h1>

      {weeks.length === 0 && <p>No challenges yet. Check back soon!</p>}

      {nextRelease && (
        <p className="next-release">
          <strong>{nextRelease.week}</strong> unlocks{" "}
          {formatMeetingDate(nextRelease.date)} ({nextRelease.count} new{" "}
          {nextRelease.count === 1 ? "challenge" : "challenges"}). New challenges drop every Monday.
        </p>
      )}

      {weeks.map((week, index) => (
        <div key={index} className="week-card">

          <h2>{week.week}</h2>

          {week.challenges.map((problem) => (
            <div
              key={problem.id}
              className="problem-card"
            >
              <h3>
                {problem.title}
                {solved.has(problem.id) && (
                  <span className="problem-card-solved" title={`Solved in ${solved.get(problem.id).length} language(s)`}>
                    ✓ Solved{solved.get(problem.id).length > 1 ? ` ×${solved.get(problem.id).length}` : ""}
                  </span>
                )}
              </h3>

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
