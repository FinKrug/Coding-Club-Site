// Dates in club time (Neumont is in Utah). Used for meeting countdowns
// and for unlocking each week's challenges at midnight Utah time, no
// matter where the visitor or the server is.

export const CLUB_TIME_ZONE = "America/Denver";
const DAY_MS = 24 * 60 * 60 * 1000;

// Today's date in club time, as "YYYY-MM-DD".
export function clubToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CLUB_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

// "2026-10-05" + 7 -> "2026-10-12" (plain calendar math, no time zones)
export function addDays(iso, days) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) + days * DAY_MS).toISOString().slice(0, 10);
}
