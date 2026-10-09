import { ObjectId } from "mongodb";
import { withDb } from "@/lib/mongodb";
import { LANGUAGE_LIST } from "@/lib/judge/languageList.mjs";

// The leaderboard ranks members by points EARNED (solves + achievements),
// worked out from the records rather than users.points. That way spending
// points in the shop never drops anyone down the board, and "this month"
// can count only what was earned this month.
//
// What other members see: first name + last initial, points, challenges
// solved and languages used. Never emails. Members can hide themselves
// from the Account page (users.hideFromLeaderboard).
//
// Server-only.

export const LEADERBOARD_SIZE = 50;
const CLUB_TIME_ZONE = "America/Denver"; // Neumont is in Utah

// "Finley Krug" -> "Finley K."   "Finley" -> "Finley"
export function displayName(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Member";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

// Midnight on the 1st of the current month, club time, as a Date.
export function startOfMonth(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: CLUB_TIME_ZONE, year: "numeric", month: "numeric" })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  );
  const guess = Date.UTC(Number(parts.year), Number(parts.month) - 1, 1);
  // How far club time is behind UTC at that moment (6 or 7 hours).
  const clock = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: CLUB_TIME_ZONE,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    })
      .formatToParts(new Date(guess))
      .map((p) => [p.type, p.value])
  );
  const asIfUtc = Date.UTC(clock.year, clock.month - 1, clock.day, clock.hour, clock.minute);
  return new Date(guess + (guess - asIfUtc));
}

export function monthName(now = new Date()) {
  return now.toLocaleDateString("en-US", { timeZone: CLUB_TIME_ZONE, month: "long", year: "numeric" });
}

// period: "all" or "month". viewerId: the signed-in member (or null).
// Returns {
//   rows: [{ rank, name, points, challenges, languages, isYou }]  (top 50)
//   you:  your row if you're ranked below the top 50, else null
//   youHidden: true if you've hidden yourself
//   ranked: how many members are on the board
// }
export async function getLeaderboard({ period = "all", viewerId = null } = {}) {
  const since = period === "month" ? startOfMonth() : null;
  const solveMatch = { awarded: { $ne: false }, ...(since && { solvedAt: { $gte: since } }) };
  const achievementMatch = since ? { unlockedAt: { $gte: since } } : {};

  const { solveTotals, achievementTotals, users } = await withDb(async (db) => {
    const solvesColl = db.collection("solves");
    const [byChallenge, byLanguage, achievementTotals] = await Promise.all([
      // Points and number of different challenges solved, per member.
      solvesColl
        .aggregate([
          { $match: solveMatch },
          { $group: { _id: { userId: "$userId", challengeId: "$challengeId" }, points: { $sum: "$points" } } },
          { $group: { _id: "$_id.userId", points: { $sum: "$points" }, challenges: { $sum: 1 } } },
        ])
        .toArray(),
      // Number of different languages used, per member.
      solvesColl
        .aggregate([
          { $match: solveMatch },
          { $group: { _id: { userId: "$userId", languageId: "$languageId" } } },
          { $group: { _id: "$_id.userId", languages: { $sum: 1 } } },
        ])
        .toArray(),
      db
        .collection("achievements")
        .aggregate([{ $match: achievementMatch }, { $group: { _id: "$userId", points: { $sum: "$points" } } }])
        .toArray(),
    ]);
    const languageCounts = new Map(byLanguage.map((t) => [String(t._id), t.languages]));
    const solveTotals = byChallenge.map((t) => ({ ...t, languages: languageCounts.get(String(t._id)) || 0 }));
    const ids = [...new Set([...solveTotals, ...achievementTotals].map((t) => String(t._id)))].map(
      (id) => new ObjectId(id)
    );
    const users = ids.length
      ? await db
          .collection("users")
          .find({ _id: { $in: ids } }, { projection: { name: 1, hideFromLeaderboard: 1, createdAt: 1 } })
          .toArray()
      : [];
    return { solveTotals, achievementTotals, users };
  });

  const byUser = new Map();
  const entry = (id) => {
    const key = String(id);
    if (!byUser.has(key)) byUser.set(key, { userId: key, points: 0, challenges: 0, languages: 0 });
    return byUser.get(key);
  };
  for (const t of solveTotals) {
    const e = entry(t._id);
    e.points += t.points || 0;
    e.challenges = t.challenges;
    e.languages = t.languages;
  }
  for (const t of achievementTotals) entry(t._id).points += t.points || 0;

  const userInfo = new Map(users.map((u) => [String(u._id), u]));
  const viewer = viewerId ? String(viewerId) : null;
  const youHidden = Boolean(viewer && userInfo.get(viewer)?.hideFromLeaderboard);

  const board = [...byUser.values()]
    .filter((e) => e.points > 0 && userInfo.has(e.userId) && !userInfo.get(e.userId).hideFromLeaderboard)
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.challenges - a.challenges ||
        new Date(userInfo.get(a.userId).createdAt || 0) - new Date(userInfo.get(b.userId).createdAt || 0)
    );

  // Equal points share a rank: 1, 2, 2, 4.
  let rank = 0;
  const ranked = board.map((e, index) => {
    if (index === 0 || e.points !== board[index - 1].points) rank = index + 1;
    return {
      rank,
      name: displayName(userInfo.get(e.userId).name),
      points: e.points,
      challenges: e.challenges,
      languages: e.languages,
      isYou: e.userId === viewer,
    };
  });

  const rows = ranked.slice(0, LEADERBOARD_SIZE);
  const you = ranked.slice(LEADERBOARD_SIZE).find((row) => row.isYou) || null;
  return { rows, you, youHidden, ranked: ranked.length };
}

// For a challenge page: how many members have solved it, and the first few
// to do so (earliest passing Submit in any language).
// Returns { solvers, first: [{ name, language, solvedAt }] }
export async function getChallengeSolvers(challengeId, count = 5) {
  return withDb(async (db) => {
    const solves = await db
      .collection("solves")
      .find(
        { challengeId, awarded: { $ne: false } },
        { projection: { _id: 0, userId: 1, languageId: 1, solvedAt: 1 } }
      )
      .sort({ solvedAt: 1, _id: 1 })
      .toArray();

    const firstByUser = new Map();
    for (const solve of solves) {
      const key = String(solve.userId);
      if (!firstByUser.has(key)) firstByUser.set(key, solve);
    }
    const earliest = [...firstByUser.values()];
    const users = earliest.length
      ? await db
          .collection("users")
          .find(
            { _id: { $in: earliest.slice(0, count * 3).map((s) => s.userId) } },
            { projection: { name: 1, hideFromLeaderboard: 1 } }
          )
          .toArray()
      : [];
    const userInfo = new Map(users.map((u) => [String(u._id), u]));

    const first = earliest
      .filter((s) => userInfo.has(String(s.userId)) && !userInfo.get(String(s.userId)).hideFromLeaderboard)
      .slice(0, count)
      .map((s) => ({
        name: displayName(userInfo.get(String(s.userId)).name),
        language: LANGUAGE_LIST.find((l) => l.id === s.languageId)?.name || "?",
        solvedAt: s.solvedAt,
      }));
    return { solvers: firstByUser.size, first };
  });
}
