import schedule from "@/data/challengeSchedule";
import { addDays, clubToday } from "@/lib/clubTime";

// When challenges unlock. Two ways to schedule one:
//   1. `releaseDate: "YYYY-MM-DD"` on the challenge itself (wins if set), or
//   2. its "Week N" label, counted from week1Start in data/challengeSchedule.js.
// Either way it appears at midnight Utah time that day. Anything else (e.g.
// "Club Fair" with no releaseDate) is always visible.

// "Week 3" -> 3. Anything else (e.g. "Club Fair") -> null.
export function weekNumber(week) {
  const match = /^\s*week\s+(\d+)\s*$/i.exec(String(week ?? ""));
  return match ? Number(match[1]) : null;
}

// The day a week unlocks, "YYYY-MM-DD", or null if it's always visible.
export function releaseDateFor(week, { week1Start } = schedule) {
  const n = weekNumber(week);
  if (!n || !week1Start) return null;
  return addDays(week1Start, (n - 1) * 7);
}

export function isReleased(week, today = clubToday(), settings = schedule) {
  const date = releaseDateFor(week, settings);
  return !date || date <= today;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// The day a challenge unlocks, "YYYY-MM-DD", or null if it's always visible.
export function releaseDateOf(challenge, settings = schedule) {
  const own = challenge?.releaseDate;
  if (typeof own === "string" && ISO_DATE.test(own)) return own;
  return releaseDateFor(challenge?.week, settings);
}

export function isChallengeReleased(challenge, today = clubToday(), settings = schedule) {
  const date = releaseDateOf(challenge, settings);
  return !date || date <= today;
}
