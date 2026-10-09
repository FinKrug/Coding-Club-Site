"use client";

// Shows the outcome of Run Code / Submit for a challenge with tests.

import { LANGUAGE_LIST } from "@/lib/judge/languageList.mjs";

function PointsBanner({ points }) {
  if (!points) return null;
  const language = LANGUAGE_LIST.find((l) => l.id === points.languageId);
  const name = language ? language.name : "this language";
  if (points.error) return <div className="points-banner error">{points.error}</div>;
  if (points.alreadySolved) {
    return (
      <div className="points-banner repeat">
        You&apos;ve already earned the points for this challenge in {name}. Solve it in another language to earn more!
      </div>
    );
  }
  const multiplier = language && language.multiplier !== 1 ? ` (${language.multiplier}× for ${name})` : "";
  const unlocked = points.achievements || [];
  return (
    <>
      <div className="points-banner earned">
        +{points.awarded} points{multiplier}!
        {points.total !== null && points.total !== undefined ? ` You now have ${points.total.toLocaleString()}.` : ""}
      </div>
      {unlocked.map((achievement) => (
        <div key={achievement.key} className="achievement-banner">
          <span className="achievement-medal" aria-hidden="true">★</span>
          <div>
            <div className="achievement-banner-label">Achievement unlocked</div>
            <div className="achievement-banner-title">{achievement.title}</div>
            <div className="achievement-banner-points">+{achievement.points} points for learning {name}</div>
          </div>
        </div>
      ))}
    </>
  );
}

const STATUS_TEXT = {
  passed: "Passed",
  failed: "Wrong answer",
  error: "Error",
  timeout: "Too slow",
  crashed: "Crashed",
  "not-run": "Not run",
};

function Summary({ results }) {
  if (results.status === "compile-error") {
    return <div className="test-summary failed">Your code didn&apos;t compile</div>;
  }
  if (results.status === "no-tests") {
    return <div className="test-summary">There are no example tests to run. Use Submit to run the full test set.</div>;
  }
  const all = results.passed === results.total;
  const label = results.mode === "submit" ? "tests" : "example tests";
  return (
    <div className={`test-summary ${all ? "passed" : "failed"}`}>
      {all
        ? results.mode === "submit"
          ? `All ${results.total} tests passed. Nice work!`
          : `All ${results.total} ${label} passed. Now try Submit.`
        : `${results.passed} of ${results.total} ${label} passed`}
    </div>
  );
}

export default function TestResults({ results, points = null }) {
  const visible = (results.tests || []).filter((t) => !t.hidden);
  const hidden = (results.tests || []).filter((t) => t.hidden);

  return (
    <div className="test-results">
      <Summary results={results} />
      <PointsBanner points={points} />

      {results.status === "compile-error" && <pre className="test-pre">{results.compileOutput}</pre>}

      {visible.map((test) => (
        <div key={test.number} className={`test-case ${test.status}`}>
          <div className="test-case-header">
            <span>Test {test.number}</span>
            <span className="test-status">{STATUS_TEXT[test.status] || test.status}</span>
          </div>
          <dl>
            <dt>Input</dt>
            <dd><code>{test.call}</code></dd>
            <dt>Expected</dt>
            <dd><code>{test.expected}</code></dd>
            {test.actual !== undefined && (
              <>
                <dt>Your answer</dt>
                <dd><code>{test.actual}</code></dd>
              </>
            )}
          </dl>
          {test.message && <p className="test-message">{test.message}</p>}
        </div>
      ))}

      {hidden.length > 0 && (
        <div className="hidden-tests">
          <div className="hidden-tests-title">
            Hidden tests: {results.hiddenPassed} of {results.hiddenTotal} passed
          </div>
          <div className="hidden-chips">
            {hidden.map((test) => (
              <span key={test.number} className={`hidden-chip ${test.status}`} title={test.message || ""}>
                #{test.number} {STATUS_TEXT[test.status] || test.status}
              </span>
            ))}
          </div>
          {hidden.some((t) => t.status === "timeout") && (
            <p className="test-message">
              A hidden test timed out. Hidden tests can use much bigger inputs, so check your solution is efficient.
            </p>
          )}
        </div>
      )}

      {results.printed && (
        <>
          <h4 className="test-subheading">What your code printed</h4>
          <pre className="test-pre">{results.printed}</pre>
        </>
      )}
      {results.stderr && (
        <>
          <h4 className="test-subheading">Errors</h4>
          <pre className="test-pre">{results.stderr}</pre>
        </>
      )}
    </div>
  );
}
