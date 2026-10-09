import { notFound } from "next/navigation";
import { getChallenge } from "@/lib/challenges";
import { getSession } from "@/lib/session";
import { getSolveSummary } from "@/lib/points";
import { LANGUAGE_LIST, NEW_LANGUAGE_BONUS, pointsFor } from "@/lib/judge/languageList.mjs";
import CodeEditor from "@/components/CodeEditor";
import InlineText from "@/components/InlineText";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  try {
    const problem = await getChallenge(id);
    if (problem) return { title: `${problem.title} — Neumont Coding Club` };
  } catch {
    // Fall through to the default title; the page itself reports the error.
  }
  return { title: "Challenge — Neumont Coding Club" };
}

export default async function ProblemPage({ params }) {
  const { id } = await params;

  let problem;
  try {
    problem = await getChallenge(id);
  } catch (error) {
    console.error("Failed to load challenge:", error);
    return (
      <div className="container">
        <h1>Challenge unavailable</h1>
        <p>We couldn&apos;t load this challenge right now. Please try again in a moment.</p>
      </div>
    );
  }

  if (!problem) notFound();

  // Which languages the signed-in member has solved this in, and which
  // languages they've used at all (for the first-solve bonus).
  let solvedLanguages = [];
  let usedLanguages = null;
  const session = await getSession();
  if (session && problem.tests.hasTests) {
    try {
      const summary = await getSolveSummary(session.userId);
      solvedLanguages = summary.byChallenge.get(problem.id) || [];
      usedLanguages = [...summary.languages];
    } catch (error) {
      console.error("Failed to load solves:", error);
    }
  }
  const solvedNames = LANGUAGE_LIST.filter((l) => solvedLanguages.includes(l.id)).map((l) => l.name);
  const topPoints = Math.max(...LANGUAGE_LIST.map((l) => pointsFor(problem.points, l.id)));

  // Blank lines in the description start a new paragraph. `code` and
  // **bold** work inside the text.
  const paragraphs = problem.description
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  // Hand-written examples win; otherwise show the challenge's visible tests.
  const tests = problem.tests;
  const examples = problem.examples.length
    ? problem.examples
    : tests.visibleTests.map((test) => ({ input: test.call, output: test.expected }));

  return (
    <div className="problem-layout">
      <div className="problem-description">
        <h1>{problem.title}</h1>

        <div className="problem-meta">
          <span className={`difficulty-badge ${problem.difficulty.toLowerCase()}`}>
            {problem.difficulty}
          </span>
          {problem.tests.hasTests && (
            <span className="problem-points">
              {problem.points}–{topPoints} pts depending on language · +{NEW_LANGUAGE_BONUS} for a language that&apos;s new to you
            </span>
          )}
        </div>

        {solvedNames.length > 0 && (
          <p className="problem-solved">✓ You&apos;ve solved this in {solvedNames.join(", ")}.</p>
        )}

        {paragraphs.map((paragraph, index) => (
          <p key={index}>
            <InlineText text={paragraph} />
          </p>
        ))}

        {examples.length > 0 && (
          <h3>{examples.length === 1 ? "Example" : "Examples"}</h3>
        )}

        {examples.map((example, index) => (
          <div key={index} className="problem-example">
            <p>
              <strong>Input:</strong> <code>{example.input}</code>
            </p>
            <p>
              <strong>Output:</strong> <code>{example.output}</code>
            </p>
          </div>
        ))}

        {tests.hasTests && (
          <p className="problem-test-note">
            Your solution is checked against {tests.visibleTests.length} example{" "}
            {tests.visibleTests.length === 1 ? "test" : "tests"}
            {tests.hiddenCount > 0 && (
              <>
                {" "}and {tests.hiddenCount} hidden {tests.hiddenCount === 1 ? "test" : "tests"} (edge cases and
                bigger inputs)
              </>
            )}
            .
          </p>
        )}

        {tests.setupProblems.length > 0 && (
          <p className="problem-setup-warning">
            This challenge&apos;s tests aren&apos;t set up correctly yet, so it can&apos;t be graded:{" "}
            {tests.setupProblems[0]}
          </p>
        )}
      </div>

      <CodeEditor
        challengeId={problem.id}
        hasTests={tests.hasTests}
        starters={tests.starters}
        supportedLanguages={tests.languages}
        solvedLanguages={solvedLanguages}
        usedLanguages={usedLanguages}
        basePoints={problem.points}
      />
    </div>
  );
}
