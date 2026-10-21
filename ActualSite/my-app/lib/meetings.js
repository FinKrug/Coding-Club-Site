// Date math for the weekly meeting schedule in data/meetings.js.
// Pure functions (no React) so they're easy to test. Dates are plain
// "YYYY-MM-DD" strings in club time (Utah), so daylight saving and the
// visitor's own time zone can't shift a meeting onto the wrong day.

import { clubToday } from "./clubTime";

export { clubToday };

const DAY_MS = 24 * 60 * 60 * 1000;

function toUtc(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function toIso(utcMs) {
  return new Date(utcMs).toISOString().slice(0, 10);
}

// Every meeting date from firstDate through lastDate, 7 days apart.
export function meetingDates({ firstDate, lastDate }) {
  const dates = [];
  for (let t = toUtc(firstDate); t <= toUtc(lastDate); t += 7 * DAY_MS) dates.push(toIso(t));
  return dates;
}

// "2026-10-21" -> "Wednesday, Oct 21"
export function formatMeetingDate(iso, options = { weekday: "long", month: "short", day: "numeric" }) {
  return new Date(toUtc(iso)).toLocaleDateString("en-US", { timeZone: "UTC", ...options });
}

// Where today falls in the schedule.
// Returns { state: "upcoming" | "today" | "done", next, daysAway, number, total, dates }
//   next      the next meeting date (today's, if there's one today), or null when done
//   daysAway  0 = today, 1 = tomorrow, ...
//   number    which meeting `next` is (1-based) out of `total`
export function meetingStatus(schedule, today = clubToday()) {
  const dates = meetingDates(schedule);
  const index = dates.findIndex((date) => date >= today);
  if (index === -1) return { state: "done", next: null, daysAway: null, number: null, total: dates.length, dates };
  const next = dates[index];
  const daysAway = Math.round((toUtc(next) - toUtc(today)) / DAY_MS);
  return {
    state: daysAway === 0 ? "today" : "upcoming",
    next,
    daysAway,
    number: index + 1,
    total: dates.length,
    dates,
  };
}

export function countdownText(daysAway) {
  if (daysAway === 0) return "Today!";
  if (daysAway === 1) return "Tomorrow";
  return `In ${daysAway} days`;
}
