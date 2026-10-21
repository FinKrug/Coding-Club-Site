import schedule from "@/data/challengeSchedule";
import { addDays, clubToday } from "@/lib/clubTime";

// Week-by-week unlocking for challenges (settings in data/challengeSchedule.js).

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
