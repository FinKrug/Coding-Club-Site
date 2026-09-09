import Link from "next/link";

export default function Home() {
  return (
    <div className="container">
      <section className="hero">
        <span className="eyebrow">Neumont Coding Club</span>

        <h1>
          Learn. Build. <span className="accent">Compete.</span>
        </h1>

        <p>
          A place for students to practice algorithms, ship real projects,
          and prepare for technical interviews — together.
        </p>

        <Link href="/problems">
          <button className="btn-primary" type="button">
            View Challenges
          </button>
        </Link>
      </section>

      <section className="beginner-callout beginner-callout-home">
        <span className="beginner-callout-label">New here?</span>
        <p>
          No experience, no IDE, and nothing to install — this site has a
          code editor and a Run Code button built right in. Jump into a
          challenge, or read a quick, no-jargon walkthrough first on our{" "}
          <Link href="/resources/getting-started">Start Here page</Link>.
        </p>
      </section>

      <section className="info-block">
        <h2>About Us</h2>
        <p>
          The Neumont Coding Club is a place for students to practice
          algorithms, work on projects, and prepare for technical interviews.
        </p>
      </section>

      <section className="info-block">
        <h2>Upcoming Events</h2>
        <ul>
          <li>Weekly Coding Challenge</li>
          <li>Game Development Night</li>
          <li>Hackathon Preparation Workshop</li>
        </ul>
      </section>
    </div>
  );
}
