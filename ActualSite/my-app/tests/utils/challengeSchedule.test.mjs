import test from "node:test";
import assert from "node:assert/strict";
import {
  weekNumber,
  releaseDateFor,
  isReleased,
  releaseDateOf,
  isChallengeReleased,
} from "../../lib/challengeSchedule.js";
import { addDays } from "../../lib/clubTime.js";

test("challengeSchedule.js - weekNumber parsing", () => {
  assert.equal(weekNumber("Week 1"), 1);
  assert.equal(weekNumber("week 4"), 4);
  assert.equal(weekNumber("  Week  10  "), 10);
  assert.equal(weekNumber("Club Fair"), null);
  assert.equal(weekNumber(""), null);
  assert.equal(weekNumber(null), null);
});

test("challengeSchedule.js - releaseDateFor calculation", () => {
  const settings = { week1Start: "2026-10-05" };
  assert.equal(releaseDateFor("Week 1", settings), "2026-10-05");
  assert.equal(releaseDateFor("Week 2", settings), "2026-10-12");
  assert.equal(releaseDateFor("Week 3", settings), "2026-10-19");
  assert.equal(releaseDateFor("Club Fair", settings), null);
});

test("challengeSchedule.js - isReleased comparison", () => {
  const settings = { week1Start: "2026-10-05" };
  // Before Week 2
  assert.equal(isReleased("Week 2", "2026-10-11", settings), false);
  // On Week 2
  assert.equal(isReleased("Week 2", "2026-10-12", settings), true);
  // After Week 2
  assert.equal(isReleased("Week 2", "2026-10-13", settings), true);
  // Non-week label is always released
  assert.equal(isReleased("Club Fair", "2026-10-01", settings), true);
});

test("challengeSchedule.js - releaseDateOf explicit releaseDate overrides week", () => {
  const settings = { week1Start: "2026-10-05" };
  const challenge = {
    week: "Week 1",
    releaseDate: "2026-10-25",
  };
  assert.equal(releaseDateOf(challenge, settings), "2026-10-25");
  assert.equal(isChallengeReleased(challenge, "2026-10-20", settings), false);
  assert.equal(isChallengeReleased(challenge, "2026-10-25", settings), true);
});

test("clubTime.js - addDays calendar math", () => {
  assert.equal(addDays("2026-10-05", 7), "2026-10-12");
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
});
