import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { getSession } from "@/lib/session";
import { withDb } from "@/lib/mongodb";
import { LANGUAGE_LIST } from "@/lib/judge/languageList.mjs";
import { ACHIEVEMENTS } from "@/lib/achievements.mjs";
import { getLeaderboard } from "@/lib/leaderboard";
import Link from "next/link";

export const metadata = {
  title: "Your Account — Neumont Coding Club",
};

export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }) {
  const { leaderboardError } = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login?returnTo=/account");

  let user = null;
  let solves = [];
  let unlocked = [];
  let dbError = false;
  try {
    // One connection for all three queries.
    [user, solves, unlocked] = await withDb((db) =>
      Promise.all([
        db.collection("users").findOne({ _id: new ObjectId(session.userId) }),
        db
          .collection("solves")
          .find({ userId: new ObjectId(session.userId) }, { projection: { _id: 0, challengeId: 1, languageId: 1 } })
          .toArray(),
        db
          .collection("achievements")
          .find({ userId: new ObjectId(session.userId) }, { projection: { _id: 0, key: 1, unlockedAt: 1 } })
          .toArray(),
      ])
    );
  } catch (error) {
    console.error("Failed to load account:", error);
    dbError = true;
  }

  // Where they stand on the all-time leaderboard.
  let standing = null;
  if (!dbError) {
    try {
      const board = await getLeaderboard({ viewerId: session.userId });
      standing = {
        row: board.rows.find((row) => row.isYou) || board.you,
        ranked: board.ranked,
      };
    } catch (error) {
      console.error("Failed to load leaderboard standing:", error);
    }
  }
  const hidden = Boolean(user?.hideFromLeaderboard);

  const name = user?.name ?? session.name;
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

  const challengesSolved = new Set(solves.map((solve) => solve.challengeId)).size;
  const unlockedAt = new Map(unlocked.map((a) => [a.key, a.unlockedAt]));
  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const perLanguage = LANGUAGE_LIST.map((language) => ({
    ...language,
    count: solves.filter((solve) => solve.languageId === language.id).length,
  })).filter((language) => language.count > 0);

  return (
    <div className="container">
      <section className="hero account-hero">
        <span className="eyebrow">Your Account</span>
        <h1>
          Hey, <span className="accent">{name.split(" ")[0]}</span>
        </h1>
        <p>{user?.email ?? session.email}</p>
      </section>

      <div className="account-grid">
        <div className="account-card">
          <span className="account-card-label">Points</span>
          <span className="account-points">
            {dbError ? "—" : (user?.points ?? 0).toLocaleString()}
          </span>
          <p className="account-card-note">
            {dbError
              ? "Couldn't reach the database right now. Try again in a bit."
              : "Earn points by solving challenges, in as many languages as you can."}
          </p>
        </div>

        <div className="account-card">
          <span className="account-card-label">Member since</span>
          <span className="account-card-value">{memberSince ?? "—"}</span>
          <p className="account-card-note">
            The points shop (fonts, color schemes, stickers) is coming soon.
          </p>
        </div>
      </div>

      {!dbError && (
        <div className="account-card account-solves">
          <span className="account-card-label">Challenges solved</span>
          <span className="account-card-value">
            {challengesSolved} {challengesSolved === 1 ? "challenge" : "challenges"} · {solves.length}{" "}
            {solves.length === 1 ? "solution" : "solutions"}
          </span>
          {perLanguage.length > 0 ? (
            <div className="account-languages">
              {perLanguage.map((language) => (
                <span key={language.id} className={`account-language${language.tier === "new" ? " priority" : ""}`}>
                  {language.name}: {language.count}
                </span>
              ))}
            </div>
          ) : (
            <p className="account-card-note">
              Solve a challenge and press Submit to earn your first points.
            </p>
          )}
        </div>
      )}

      {!dbError && (
        <div className="account-card account-achievements">
          <span className="account-card-label">
            Achievements · {unlockedAt.size} of {ACHIEVEMENTS.length}
          </span>
          <div className="achievement-grid">
            {ACHIEVEMENTS.map((achievement) => {
              const date = unlockedAt.get(achievement.key);
              return (
                <div
                  key={achievement.key}
                  className={`achievement-badge${date ? " unlocked" : ""}`}
                  title={date ? `Unlocked ${formatDate(date)}` : achievement.description}
                >
                  <span className="achievement-medal" aria-hidden="true">★</span>
                  <div>
                    <div className="achievement-badge-title">{achievement.title}</div>
                    <div className="achievement-badge-detail">
                      {date ? `Unlocked ${formatDate(date)}` : `${achievement.description} +${achievement.points} pts`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!dbError && (
        <div className="account-card account-leaderboard" id="leaderboard">
          <span className="account-card-label">Leaderboard</span>
          <span className="account-card-value">
            {hidden
              ? "Hidden"
              : standing?.row
                ? `#${standing.row.rank} of ${standing.ranked}`
                : "Not ranked yet"}
          </span>
          <p className="account-card-note">
            {hidden
              ? "You're hidden from the leaderboard and challenge first-solver lists. You still earn points."
              : standing?.row
                ? <>All time. Other members see you as <strong>{standing.row.name}</strong>, with your points and solves. <Link href="/leaderboard">See the leaderboard</Link></>
                : "Earn points to get on the board. Other members see your first name and last initial, never your email."}
          </p>
          {leaderboardError && (
            <p className="account-card-note account-error">Couldn&apos;t save that just now. Please try again.</p>
          )}
          <form action="/api/account/leaderboard" method="post" className="account-inline-form">
            <input type="hidden" name="visible" value={hidden ? "1" : "0"} />
            <button type="submit" className="btn-ghost">
              {hidden ? "Show me on the leaderboard" : "Hide me from the leaderboard"}
            </button>
          </form>
        </div>
      )}

      <form action="/api/auth/logout" method="post" className="account-actions">
        <button type="submit" className="btn-ghost">
          Sign out
        </button>
      </form>
    </div>
  );
}
