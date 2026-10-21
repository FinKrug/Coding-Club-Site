import { withDb } from "@/lib/mongodb";
import { cached } from "@/lib/cache";
import { isReleased, releaseDateFor } from "@/lib/challengeSchedule";
import { clubToday } from "@/lib/clubTime";
import {
  LANGUAGES,
  formatCall,
  formatValue,
  starterCode,
  supportsLanguage,
  validateSpec,
} from "@/lib/judge/index.mjs";

// Reads coding challenges from the `challenges` collection in MongoDB.
// Add a challenge by pasting a JSON document into Atlas (see the README's
// "Adding a Challenge" section). The database rejects documents that are
// missing required fields; see scripts/setup-db.mjs for the rules.
//
// Server-only. Never import this from a "use client" component.
//
// Hidden tests never leave this file: getChallenge() only returns the
// visible ones, and grading (which needs all of them) happens on the server.
//
// Each week's challenges unlock on their own Monday (lib/challengeSchedule.js).
// Until then they're treated as if they don't exist: not listed, their page
// is a 404, and they can't be run or submitted. The check happens after the
// cache, so a week appears right at midnight, not up to 5 minutes later.

const LIST_FIELDS = {
  _id: 0,
  id: 1,
  title: 1,
  difficulty: 1,
  week: 1,
  points: 1,
};

const PAGE_FIELDS = {
  ...LIST_FIELDS,
  description: 1,
  examples: 1,
  function: 1,
  tests: 1,
};

const DIFFICULTIES = ["Easy", "Medium", "Hard"];

// Challenges rarely change, so they're cached for 5 minutes (lib/cache.js).
// An edit made in Atlas can take up to that long to show on the site.
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

// Fills in defaults so a hand-pasted document with optional fields left
// out still renders cleanly.
function normalize(doc) {
  return {
    id: Number(doc.id),
    title: String(doc.title ?? "Untitled challenge"),
    difficulty: DIFFICULTIES.includes(doc.difficulty) ? doc.difficulty : "Easy",
    week: doc.week ? String(doc.week) : "Week 1",
    description: String(doc.description ?? ""),
    examples: Array.isArray(doc.examples)
      ? doc.examples.map((example) => ({
          input: String(example?.input ?? ""),
          output: String(example?.output ?? ""),
        }))
      : [],
    points: Number.isFinite(doc.points) ? doc.points : 10,
  };
}

// The test-related part of a challenge that's safe to send to the browser.
function testInfo(doc) {
  if (!doc.function) {
    return { hasTests: false, setupProblems: [], visibleTests: [], hiddenCount: 0, starters: {}, languages: [] };
  }
  const setupProblems = validateSpec(doc.function, doc.tests);
  if (setupProblems.length) {
    return { hasTests: false, setupProblems, visibleTests: [], hiddenCount: 0, starters: {}, languages: [] };
  }
  const fn = doc.function;
  const visible = doc.tests.filter((test) => !test.hidden);
  const languages = LANGUAGES.filter((language) => supportsLanguage(fn, language.id)).map((language) => language.id);
  const starters = {};
  for (const id of languages) starters[id] = starterCode(fn, id);
  return {
    hasTests: true,
    setupProblems: [],
    functionName: fn.name,
    visibleTests: visible.map((test) => ({ call: formatCall(fn, test.args), expected: formatValue(test.expected) })),
    hiddenCount: doc.tests.length - visible.length,
    starters,
    languages,
  };
}

// `published: false` hides a challenge while you're still writing it.
const VISIBLE = { published: { $ne: false } };

function parseId(id) {
  const numericId = Number(id);
  return Number.isInteger(numericId) && numericId >= 1 ? numericId : null;
}

export async function listChallenges() {
  const all = await cached("challenges:list", CHALLENGE_TTL_MS, loadChallengeList);
  const today = clubToday();
  return all.filter((challenge) => isReleased(challenge.week, today));
}

// The next week that still has locked challenges, e.g.
// { week: "Week 3", date: "2026-10-19", count: 3 }, or null if none.
export async function getNextRelease() {
  const all = await cached("challenges:list", CHALLENGE_TTL_MS, loadChallengeList);
  const today = clubToday();
  const upcoming = new Map();
  for (const challenge of all) {
    if (isReleased(challenge.week, today)) continue;
    const date = releaseDateFor(challenge.week);
    const entry = upcoming.get(date) || { week: challenge.week, date, count: 0 };
    entry.count += 1;
    upcoming.set(date, entry);
  }
  const [first] = [...upcoming.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  return first || null;
}

async function loadChallengeList() {
  const docs = await withDb((db) =>
    db
      .collection("challenges")
      .find(VISIBLE, { projection: LIST_FIELDS })
      .sort({ id: 1 })
      .toArray()
  );
  return docs.map(normalize);
}

export async function getChallenge(id) {
  const numericId = parseId(id);
  if (!numericId) return null;
  const challenge = await cached(`challenges:page:${numericId}`, CHALLENGE_TTL_MS, () => loadChallenge(numericId));
  return challenge && isReleased(challenge.week) ? challenge : null;
}

async function loadChallenge(numericId) {
  const doc = await withDb((db) =>
    db.collection("challenges").findOne({ id: numericId, ...VISIBLE }, { projection: PAGE_FIELDS })
  );
  return doc ? { ...normalize(doc), tests: testInfo(doc) } : null;
}

// Everything grading needs, including hidden tests. Never send this to the
// browser.
export async function getChallengeForGrading(id) {
  const numericId = parseId(id);
  if (!numericId) return null;
  const challenge = await cached(`challenges:grading:${numericId}`, CHALLENGE_TTL_MS, () =>
    loadChallengeForGrading(numericId)
  );
  return challenge && isReleased(challenge.week) ? challenge : null;
}

async function loadChallengeForGrading(numericId) {
  const doc = await withDb((db) =>
    db.collection("challenges").findOne(
      { id: numericId, ...VISIBLE },
      { projection: { _id: 0, id: 1, title: 1, week: 1, points: 1, function: 1, tests: 1, timeLimitSeconds: 1 } }
    )
  );
  return doc || null;
}
