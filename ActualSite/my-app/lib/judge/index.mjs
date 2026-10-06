// Everything the site needs to turn a member's code + a challenge's tests
// into a program for Judge0, and to read the results back.
//
//   LANGUAGES                 the languages the editor offers (Judge0 ids)
//   starterCode(fn, id)       starting code for a language
//   buildProgram(fn, id, ...) member code + test runner, ready for Judge0
//
// Plain module with no Next.js imports, so scripts can import it too.
import { python } from "./languages/python.mjs";
import { javascript, typescript } from "./languages/javascript.mjs";
import { java } from "./languages/java.mjs";
import { csharp } from "./languages/csharp.mjs";
import { cpp } from "./languages/cpp.mjs";
import { c } from "./languages/c.mjs";
import { rust } from "./languages/rust.mjs";
import { go } from "./languages/go.mjs";
import { LANGUAGE_LIST } from "./languageList.mjs";

export * from "./types.mjs";
export { LANGUAGE_LIST };

const HARNESSES = { python, java, csharp, javascript, cpp, c, rust, go, typescript };

export const LANGUAGES = LANGUAGE_LIST.map((language) => ({ ...language, harness: HARNESSES[language.key] }));

export function getLanguage(id) {
  return LANGUAGES.find((language) => language.id === Number(id)) || null;
}

export function supportsLanguage(fn, id) {
  const language = getLanguage(id);
  return Boolean(language && language.harness.supports(fn));
}

export function starterCode(fn, id) {
  const language = getLanguage(id);
  return language ? language.harness.starter(fn) : "";
}

export function buildProgram(fn, id, code, nonce) {
  const language = getLanguage(id);
  if (!language) throw new Error(`Unknown language ${id}`);
  return language.harness.program(fn, code, nonce);
}
