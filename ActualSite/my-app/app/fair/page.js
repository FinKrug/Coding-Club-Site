import Link from "next/link";
import { getChallenge } from "@/lib/challenges";
import { getSession } from "@/lib/session";
import { getSolveSummary } from "@/lib/points";
import FairEditor, { CopyLine } from "@/components/FairEditor";
import fairInfo from "@/data/fairInfo";

// The club fair landing page (the QR code at the booth points here).
// A complete beginner can write and run one line of code without an
// account. Signed-in members can also Submit it for points.

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Write Your First Program — Neumont Coding Club",
  description: "Two minutes, no experience, nothing to install. Write your first program with the Neumont Coding Club.",
};

const ANSWER_LINE = 'return "Hello, " + name + "!"';

export default async function FairPage() {
  const session = await getSession();

  let challenge = null;
  try {
    challenge = await getChallenge(fairInfo.challengeId);
  } catch (error) {
    console.error("Failed to load the fair challenge:", error);
  }

  let solvedLanguages = [];
  let usedLanguages = null;
  if (session && challenge?.tests.hasTests) {
    try {
      const summary = await getSolveSummary(session.userId);
      solvedLanguages = summary.byChallenge.get(challenge.id) || [];
      usedLanguages = [...summary.languages];
    } catch (error) {
      console.error("Failed to load solves:", error);
    }
  }

  return (
    <div className="container fair-page">
      <section className="fair-hero">
        <span className="eyebrow">Neumont Coding Club · Club Fair</span>
        <h1>
          Write your first <span className="accent">program</span>
        </h1>
        <p>
          About two minutes. No experience, no account and nothing to install. Just you, this page
          and one line of code.
        </p>
        {fairInfo.discordUrl && (
          <p className="fair-discord-line">
            Questions about the club?{" "}
            <a href={fairInfo.discordUrl} target="_blank" rel="noopener noreferrer">
              Ask us on Discord
            </a>
            .
          </p>
        )}
        <span className="fair-status">
          {session
            ? `Signed in as ${session.name || session.email}. Your points will be saved.`
            : "Playing as a guest. Run Code works without an account."}
        </span>
      </section>

      {challenge?.tests.hasTests ? (
        <div className="fair-layout">
          <div className="fair-steps">
            <ol>
              <li>
                <h3>Meet the code</h3>
                <p>
                  The editor holds a <strong>function</strong> called <code>greet</code>. A function is
                  a little machine: you hand it something (here, someone&apos;s <code>name</code>) and
                  it hands something back. Ignore anything above the <code>def</code> line for now.
                </p>
              </li>
              <li>
                <h3>Type one line</h3>
                <p>
                  Delete the word <code>pass</code> and type this in its place. Keep the spaces in
                  front of it, because Python uses them to know the line belongs to the function.
                </p>
                <CopyLine text={ANSWER_LINE} />
                <p className="fair-note">
                  Picked a different language? Put the same line between the <code>{"{ }"}</code> and
                  end it with a <code>;</code>
                </p>
              </li>
              <li>
                <h3>Press Run Code</h3>
                <p>
                  We&apos;ll try your function on a couple of names. Green means it works.
                </p>
              </li>
              <li>
                <h3>{session ? "Press Submit for points" : "Earn points (optional)"}</h3>
                <p>
                  {session
                    ? "Submit runs a few hidden tests too. Pass them and the points go on your account and the leaderboard."
                    : "Make a free account (your Neumont email works), then press Submit to earn your first points. Your code stays here while you sign up."}
                </p>
              </li>
              <li>
                <h3>Bonus: break it on purpose</h3>
                <p>
                  Change <code>&quot;Hello, &quot;</code> to <code>&quot;Hey, &quot;</code> and run it
                  again. The tests fail, because they expect &quot;Hello&quot;. That&apos;s how
                  programmers find out when something changed by accident.
                </p>
              </li>
            </ol>

            <details className="fair-stuck">
              <summary>Stuck? See the whole answer</summary>
              <pre>{`def greet(name: str) -> str:\n    ${ANSWER_LINE}`}</pre>
              <p>
                Or wave at someone at the booth
                {fairInfo.discordUrl && (
                  <>
                    {" "}or ask in our{" "}
                    <a href={fairInfo.discordUrl} target="_blank" rel="noopener noreferrer">
                      Discord
                    </a>
                  </>
                )}
                . We&apos;re happy to help.
              </p>
            </details>
          </div>

          <FairEditor
            signedIn={Boolean(session)}
            discordUrl={fairInfo.discordUrl}
            challengeId={challenge.id}
            hasTests={challenge.tests.hasTests}
            starters={challenge.tests.starters}
            supportedLanguages={challenge.tests.languages}
            solvedLanguages={solvedLanguages}
            usedLanguages={usedLanguages}
            basePoints={challenge.points}
          />
        </div>
      ) : (
        <section className="info-block">
          <h2>The fair challenge isn&apos;t ready yet</h2>
          <p>
            Try one of our other <Link href="/problems">beginner challenges</Link> in the meantime, or
            read the <Link href="/resources/getting-started">Start Here</Link> guide.
          </p>
        </section>
      )}

      <section className="info-block fair-join">
        <h2>Liked that? Come build with us</h2>
        <p>
          The Neumont Coding Club is for everyone, including people who wrote their first line of code
          five minutes ago. We practice together, build projects and compete in challenges like this
          one.
        </p>
        {fairInfo.discordUrl && (
          <p className="fair-meeting">
            Meeting times, events and announcements are all posted in our Discord. Join to find out
            when we meet next.
          </p>
        )}
        <div className="fair-win-actions">
          {fairInfo.discordUrl && (
            <a href={fairInfo.discordUrl} className="btn-primary" target="_blank" rel="noopener noreferrer">
              Join our Discord
            </a>
          )}
          <Link href="/problems" className={fairInfo.discordUrl ? "btn-ghost" : "btn-primary"}>
            More challenges
          </Link>
          <Link href="/resources/getting-started" className="btn-ghost">
            New to coding? Start here
          </Link>
        </div>
      </section>
    </div>
  );
}
