// Runs a member's code against a challenge's tests and decides what passed.
//
// `execute` sends a program to Judge0 (or, in local tests, runs it directly)
// and returns Judge0's result object: { status: { id, description }, stdout,
// stderr, compile_output, message, time, memory }.
//
// mode "run":    visible tests only; shows the member everything, including
//                what their code printed.
// mode "submit": every test; hidden tests report only passed/failed, and
//                printed output is withheld so it can't leak hidden inputs.
import {
  buildProgram,
  encodeInput,
  formatCall,
  formatValue,
  getLanguage,
  parseOutput,
  parseType,
  supportsLanguage,
  validateSpec,
  valuesEqual,
} from "./index.mjs";

// Judge0 status ids
const ACCEPTED = 3;
const TIME_LIMIT = 5;
const COMPILE_ERROR = 6;
const RUNTIME_ERRORS = [7, 8, 9, 10, 11, 12];

const MAX_SHOWN_OUTPUT = 4000;

function clip(text) {
  const value = String(text || "");
  return value.length > MAX_SHOWN_OUTPUT ? value.slice(0, MAX_SHOWN_OUTPUT) + "\n… (output cut off)" : value;
}

function randomNonce() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return "ncc" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export class GradingError extends Error {}

export function clampTimeLimit(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value)) return 2;
  return Math.min(10, Math.max(1, value));
}

export async function grade({ fn, tests, languageId, code, mode, execute, timeLimitSeconds }) {
  const language = getLanguage(languageId);
  if (!language) throw new GradingError("That language isn't supported.");

  const problems = validateSpec(fn, tests);
  if (problems.length) {
    throw new GradingError(`This challenge's tests are set up incorrectly: ${problems[0]}`);
  }
  if (!supportsLanguage(fn, languageId)) {
    throw new GradingError(`This challenge can't be solved in ${language.name} (it uses grids, which ${language.name} can't take as parameters).`);
  }

  const selected = tests
    .map((test, index) => ({ ...test, originalIndex: index, hidden: Boolean(test.hidden) }))
    .filter((test) => mode === "submit" || !test.hidden);
  if (selected.length === 0) {
    return { status: "no-tests", passed: 0, total: 0, tests: [], hiddenPassed: 0, hiddenTotal: 0 };
  }

  const nonce = randomNonce();
  const cpuTimeLimit = clampTimeLimit(timeLimitSeconds);
  const result = await execute({
    source: buildProgram(fn, languageId, code, nonce),
    languageId,
    stdin: encodeInput(fn, selected),
    cpuTimeLimit,
  });

  const statusId = result && result.status ? result.status.id : 0;
  const showDetails = mode === "run";

  if (statusId === COMPILE_ERROR) {
    return {
      status: "compile-error",
      compileOutput: clip(result.compile_output || result.stderr || result.message),
      passed: 0,
      total: selected.length,
      tests: [],
      hiddenPassed: 0,
      hiddenTotal: selected.filter((t) => t.hidden).length,
    };
  }
  if (![ACCEPTED, TIME_LIMIT, ...RUNTIME_ERRORS].includes(statusId)) {
    throw new GradingError(
      `The code runner had a problem (${(result && result.status && result.status.description) || "no response"}). Please try again.`
    );
  }

  const returnType = parseType(fn.returns);
  const { results, printed } = parseOutput(result.stdout, nonce, fn);
  let firstMissingSeen = false;

  const graded = selected.map((test, index) => {
    const outcome = results.get(index);
    let status;
    let message = "";
    if (outcome && outcome.status === "ok") {
      status = valuesEqual(outcome.value, test.expected, returnType, Boolean(fn.anyOrder)) ? "passed" : "failed";
    } else if (outcome && outcome.status === "error") {
      status = "error";
      message = outcome.message;
    } else if (!firstMissingSeen) {
      firstMissingSeen = true;
      if (statusId === TIME_LIMIT) {
        status = "timeout";
        message = `Took longer than the ${cpuTimeLimit}s time limit.`;
      } else if (RUNTIME_ERRORS.includes(statusId)) {
        status = "crashed";
        message = `Your program crashed (${result.status.description}).`;
      } else {
        status = "error";
        message = "Your program stopped before finishing this test.";
      }
    } else {
      status = "not-run";
      message = "Not run, because an earlier test stopped the program.";
    }

    const entry = { number: index + 1, hidden: test.hidden, status };
    if (!test.hidden) {
      entry.call = formatCall(fn, test.args);
      entry.expected = formatValue(test.expected);
      if (outcome && outcome.status === "ok") entry.actual = formatValue(outcome.value);
      if (message) entry.message = message;
    } else if (status === "timeout" || status === "crashed" || status === "not-run") {
      entry.message = message;
    }
    return entry;
  });

  const passed = graded.filter((t) => t.status === "passed").length;
  const hidden = graded.filter((t) => t.hidden);
  return {
    status: passed === graded.length ? "passed" : "failed",
    passed,
    total: graded.length,
    hiddenPassed: hidden.filter((t) => t.status === "passed").length,
    hiddenTotal: hidden.length,
    tests: graded,
    printed: showDetails ? clip(printed) : undefined,
    stderr: showDetails ? clip(result.stderr) : undefined,
    time: result.time ?? null,
    memory: result.memory ?? null,
  };
}
