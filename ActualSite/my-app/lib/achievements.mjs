// Achievements members can unlock. Browser-safe (no database code), so the
// account page and editor can show names and points.
//
// Each achievement has:
//   key          stable id stored in the database. Never rename one that's in use.
//   title        what members see, e.g. "Learned Rust"
//   description  how to unlock it
//   points       points awarded once, when it's unlocked
//
// To add a new kind of achievement later (e.g. "Solved 10 challenges"), add
// its definition here and add the check that unlocks it in lib/points.js.
import { LANGUAGE_LIST } from "./judge/languageList.mjs";

// Points for learning a language: your first solve in it.
export const LEARNED_LANGUAGE_POINTS = 25;

export function learnedLanguageKey(languageId) {
  const language = LANGUAGE_LIST.find((l) => l.id === Number(languageId));
  return language ? `learned-${language.key}` : null;
}

export const ACHIEVEMENTS = LANGUAGE_LIST.map((language) => ({
  key: `learned-${language.key}`,
  kind: "learned-language",
  languageId: language.id,
  title: `Learned ${language.name}`,
  description: `Solve your first challenge in ${language.name}.`,
  points: LEARNED_LANGUAGE_POINTS,
}));

export function getAchievement(key) {
  return ACHIEVEMENTS.find((achievement) => achievement.key === key) || null;
}
