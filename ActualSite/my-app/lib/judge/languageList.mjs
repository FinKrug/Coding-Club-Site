// The languages the editor offers, by Judge0 language id, and how many
// points each is worth. Kept separate from the test runners so the browser
// can import it without pulling them in.
//
// Points reward stepping outside the languages Neumont already teaches:
//   taught in class (Python, Java, C#)   1x
//   taught a little (C++)                1.25x
//   not taught (everything else)         1.5x
// plus a one-time bonus the first time a member solves anything in a
// language they've never used on the site (NEW_LANGUAGE_BONUS).
//
// Order = order in the editor's dropdown.
export const LANGUAGE_LIST = [
  { id: 71, key: "python", name: "Python 3", monaco: "python", multiplier: 1, tier: "taught" },
  { id: 62, key: "java", name: "Java", monaco: "java", multiplier: 1, tier: "taught" },
  { id: 51, key: "csharp", name: "C#", monaco: "csharp", multiplier: 1, tier: "taught" },
  { id: 54, key: "cpp", name: "C++", monaco: "cpp", multiplier: 1.25, tier: "some" },
  { id: 63, key: "javascript", name: "JavaScript", monaco: "javascript", multiplier: 1.5, tier: "new" },
  { id: 74, key: "typescript", name: "TypeScript", monaco: "typescript", multiplier: 1.5, tier: "new" },
  { id: 50, key: "c", name: "C", monaco: "c", multiplier: 1.5, tier: "new" },
  { id: 73, key: "rust", name: "Rust", monaco: "rust", multiplier: 1.5, tier: "new" },
  { id: 60, key: "go", name: "Go", monaco: "go", multiplier: 1.5, tier: "new" },
];

// Points for a member's first solve (of any challenge) in a language they've
// never used on the site before. Once per language per member.
export const NEW_LANGUAGE_BONUS = 25;

export function languageMultiplier(languageId) {
  const language = LANGUAGE_LIST.find((l) => l.id === Number(languageId));
  return language ? language.multiplier : 1;
}

// A challenge's points in a given language (rounded to a whole number).
export function pointsFor(basePoints, languageId) {
  const base = Number.isFinite(basePoints) ? basePoints : 10;
  return Math.round(base * languageMultiplier(languageId));
}
