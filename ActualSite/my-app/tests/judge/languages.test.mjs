import test from "node:test";
import assert from "node:assert/strict";
import {
  LANGUAGES,
  getLanguage,
  supportsLanguage,
  starterCode,
  buildProgram,
  LANGUAGE_LIST,
} from "../../lib/judge/index.mjs";
import { pointsFor, languageMultiplier } from "../../lib/judge/languageList.mjs";

test("languages - LANGUAGES list and harnesses", () => {
  assert.ok(Array.isArray(LANGUAGES));
  assert.ok(LANGUAGES.length >= 9);

  for (const lang of LANGUAGES) {
    assert.ok(Number.isInteger(lang.id), `Language ${lang.key} has integer id`);
    assert.ok(typeof lang.name === "string", `Language ${lang.key} has string name`);
    assert.ok(typeof lang.key === "string", `Language ${lang.key} has key`);
    assert.ok(typeof lang.harness === "object", `Language ${lang.key} has harness object`);
    assert.equal(typeof lang.harness.supports, "function");
    assert.equal(typeof lang.harness.starter, "function");
    assert.equal(typeof lang.harness.program, "function");
  }
});

test("languages - getLanguage by id", () => {
  const py = getLanguage(71);
  assert.ok(py);
  assert.equal(py.name, "Python 3");

  const js = getLanguage(63);
  assert.ok(js);
  assert.equal(js.name, "JavaScript");

  assert.equal(getLanguage(999999), null);
});

test("languages - supportsLanguage: C rejects grid (2D array)", () => {
  const primitiveFn = {
    name: "simple",
    params: [{ name: "x", type: "int" }],
    returns: "int",
  };
  const gridFn = {
    name: "gridTask",
    params: [{ name: "matrix", type: "int[][]" }],
    returns: "int",
  };

  const cLang = LANGUAGES.find((l) => l.key === "c");
  assert.ok(supportsLanguage(primitiveFn, cLang.id));
  assert.equal(supportsLanguage(gridFn, cLang.id), false);

  const pyLang = LANGUAGES.find((l) => l.key === "python");
  assert.ok(supportsLanguage(primitiveFn, pyLang.id));
  assert.ok(supportsLanguage(gridFn, pyLang.id));
});

test("languages - starterCode across all languages", () => {
  const fn = {
    name: "solveProblem",
    params: [
      { name: "count", type: "int" },
      { name: "tag", type: "string" },
    ],
    returns: "bool",
  };

  for (const lang of LANGUAGES) {
    const starter = starterCode(fn, lang.id);
    assert.ok(typeof starter === "string" && starter.length > 0, `Starter code generated for ${lang.name}`);
    assert.ok(starter.includes("solveProblem"), `Starter code contains function name for ${lang.name}`);
  }
});

test("languages - buildProgram across all languages", () => {
  const fn = {
    name: "runTest",
    params: [{ name: "val", type: "int" }],
    returns: "int",
  };
  const nonce = "ncc_test_nonce_123456789";

  for (const lang of LANGUAGES) {
    const code = starterCode(fn, lang.id);
    const program = buildProgram(fn, lang.id, code, nonce);
    assert.ok(typeof program === "string" && program.length > 0, `Program generated for ${lang.name}`);
    assert.ok(program.includes(nonce), `Program contains nonce for ${lang.name}`);
  }
});

test("languages - multipliers and points calculation", () => {
  // Taught in class (Python, Java, C#) -> 1x
  assert.equal(languageMultiplier(71), 1);
  assert.equal(pointsFor(10, 71), 10);

  // C++ -> 1.25x (rounds 12.5 to 13)
  assert.equal(languageMultiplier(54), 1.25);
  assert.equal(pointsFor(10, 54), 13);

  // JavaScript, Rust, Go, etc. -> 1.5x (rounds 15 to 15)
  assert.equal(languageMultiplier(63), 1.5);
  assert.equal(pointsFor(10, 63), 15);
});
