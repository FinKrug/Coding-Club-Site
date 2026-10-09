import Link from "next/link";
import { getSession } from "@/lib/session";
import { getLeaderboard, monthName, LEADERBOARD_SIZE } from "@/lib/leaderboard";

export const metadata = {
  title: "Leaderboard — Neumont Coding Club",
};

export const dynamic = "force-dynamic";

function Row({ row }) {
  return (
    <tr className={`${row.isYou ? "is-you" : ""} ${row.rank <= 3 ? `top-${row.rank}` : ""}`}>
      <td className="lb-rank">
        <span className="lb-rank-badge">{row.rank}</span>
      </td>
      <td className="lb-name">
        {row.name}
        {row.isYou && <span className="lb-you">You</span>}
      </td>
      <td className="lb-num lb-points">{row.points.toLocaleString()}</td>
      <td className="lb-num lb-extra">{row.challenges}</td>
      <td className="lb-num lb-extra">{row.languages}</td>
    </tr>
  );
}

export default async function LeaderboardPage({ searchParams }) {
  const { period: requested } = await searchParams;
  const period = requested === "month" ? "month" : "all";
  const session = await getSession();

  let board = null;
  try {
    board = await getLeaderboard({ period, viewerId: session?.userId ?? null });
  } catch (error) {
    console.error("Failed to load leaderboard:", error);
  }

  return (
    <div className="container leaderboard-page">
      <section className="hero leaderboard-hero">
        <span className="eyebrow">Leaderboard</span>
        <h1>
          Top <span className="accent">coders</span>
        </h1>
        <p>
          Ranked by points earned from challenges and achievements. Solving in more languages is the fastest way up.
        </p>
      </section>

      <nav className="lb-tabs" aria-label="Leaderboard period">
        <Link href="/leaderboard" className={`lb-tab${period === "all" ? " active" : ""}`} aria-current={period === "all" ? "page" : undefined}>
          All time
        </Link>
        <Link
          href="/leaderboard?period=month"
          className={`lb-tab${period === "month" ? " active" : ""}`}
          aria-current={period === "month" ? "page" : undefined}
        >
          {monthName()}
        </Link>
      </nav>

      {!board ? (
        <p className="lb-empty">Couldn&apos;t load the leaderboard right now. Try again in a bit.</p>
      ) : board.rows.length === 0 ? (
        <p className="lb-empty">
          {period === "month"
            ? "Nobody has earned points this month yet. Be the first!"
            : "Nobody has earned points yet. Be the first!"}{" "}
          <Link href="/problems">Pick a challenge</Link>
        </p>
      ) : (
        <div className="lb-table-wrap">
          <table className="lb-table">
            <thead>
              <tr>
                <th className="lb-rank">#</th>
                <th>Member</th>
                <th className="lb-num">Points</th>
                <th className="lb-num lb-extra" title="Challenges solved">Solved</th>
                <th className="lb-num lb-extra" title="Languages used">Languages</th>
              </tr>
            </thead>
            <tbody>
              {board.rows.map((row) => (
                <Row key={`${row.rank}-${row.name}-${row.isYou}`} row={row} />
              ))}
              {board.you && (
                <>
                  <tr className="lb-gap" aria-hidden="true">
                    <td colSpan={5}>⋯</td>
                  </tr>
                  <Row row={board.you} />
                </>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="lb-footnote">
        {board && board.ranked > LEADERBOARD_SIZE ? `Showing the top ${LEADERBOARD_SIZE} of ${board.ranked} members. ` : ""}
        {session
          ? board?.youHidden
            ? "You're hidden from the leaderboard. You can change that on your "
            : "Spending points in the shop never lowers your rank. Don't want to be listed? Hide yourself on your "
          : "Sign in and solve a challenge to get on the board. "}
        {session ? <Link href="/account">Account page</Link> : <Link href="/login?returnTo=/leaderboard">Sign in</Link>}
        {session ? "." : ""}
      </p>
    </div>
  );
}
