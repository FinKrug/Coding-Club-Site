// The languages the editor offers, by Judge0 language id. Kept separate from
// the test runners so the browser can import it without pulling them in.
//
// Order = order in the editor's dropdown. The club's priority languages
// (Python, Java, C#) come first and earn bonus points.
export const LANGUAGE_LIST = [
  { id: 71, key: "python", name: "Python 3", monaco: "python", priority: true },
  { id: 62, key: "java", name: "Java", monaco: "java", priority: true },
  { id: 51, key: "csharp", name: "C#", monaco: "csharp", priority: true },
  { id: 63, key: "javascript", name: "JavaScript", monaco: "javascript", priority: false },
  { id: 54, key: "cpp", name: "C++", monaco: "cpp", priority: false },
  { id: 50, key: "c", name: "C", monaco: "c", priority: false },
  { id: 73, key: "rust", name: "Rust", monaco: "rust", priority: false },
  { id: 60, key: "go", name: "Go", monaco: "go", priority: false },
  { id: 74, key: "typescript", name: "TypeScript", monaco: "typescript", priority: false },
];

// Solving a challenge in a priority language earns this many times its
// base points (rounded to a whole number).
export const PRIORITY_MULTIPLIER = 1.5;

export function pointsFor(basePoints, languageId) {
  const base = Number.isFinite(basePoints) ? basePoints : 10;
  const language = LANGUAGE_LIST.find((l) => l.id === Number(languageId));
  return Math.round(base * (language && language.priority ? PRIORITY_MULTIPLIER : 1));
}
