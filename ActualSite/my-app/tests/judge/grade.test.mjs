import test from "node:test";
import assert from "node:assert/strict";
import { clampTimeLimit, grade, GradingError } from "../../lib/judge/grade.mjs";

test("grade.mjs - clampTimeLimit", () => {
  assert.equal(clampTimeLimit(0), 1);
  assert.equal(clampTimeLimit(2), 2);
  assert.equal(clampTimeLimit(5), 5);
  assert.equal(clampTimeLimit(20), 10);
  assert.equal(clampTimeLimit("invalid"), 2);
  assert.equal(clampTimeLimit(null), 2);
});

test("grade.mjs - grade: passes when all outputs match", async () => {
  const fn = {
    name: "doubleIt",
    params: [{ name: "n", type: "int" }],
    returns: "int",
  };
  const tests = [
    { args: [2], expected: 4 },
    { args: [5], expected: 10, hidden: true },
  ];

  const mockExecute = async ({ source, stdin }) => {
    // Extract nonce from generated program
    const match = /"([a-z0-9]+)\s\+"\s*\+\s*__i/.exec(source) || /"(ncc[a-f0-9]+)\s+"/.exec(source) || /nonce = "([^"]+)"/.exec(source);
    // Find nonce in source
    const nonceMatch = /ncc[a-f0-9]{24}/.exec(source);
    const nonce = nonceMatch ? nonceMatch[0] : "ncc123";

    return {
      status: { id: 3, description: "Accepted" },
      stdout: `${nonce} 0 OK 4\n${nonce} 1 OK 10\n`,
      stderr: "",
    };
  };

  const result = await grade({
    fn,
    tests,
    languageId: 71, // Python
    code: "def doubleIt(n): return n * 2",
    mode: "submit",
    execute: mockExecute,
  });

  assert.equal(result.status, "passed");
  assert.equal(result.passed, 2);
  assert.equal(result.total, 2);
  assert.equal(result.hiddenPassed, 1);
  assert.equal(result.hiddenTotal, 1);
});

test("grade.mjs - grade: handles compilation error", async () => {
  const fn = {
    name: "testFn",
    params: [{ name: "n", type: "int" }],
    returns: "int",
  };
  const tests = [{ args: [1], expected: 1 }];

  const mockExecute = async () => ({
    status: { id: 6, description: "Compilation Error" },
    compile_output: "SyntaxError: invalid syntax",
  });

  const result = await grade({
    fn,
    tests,
    languageId: 71,
    code: "bad code",
    mode: "run",
    execute: mockExecute,
  });

  assert.equal(result.status, "compile-error");
  assert.equal(result.compileOutput, "SyntaxError: invalid syntax");
  assert.equal(result.passed, 0);
});

test("grade.mjs - grade: handles timeout status", async () => {
  const fn = {
    name: "loopForever",
    params: [{ name: "n", type: "int" }],
    returns: "int",
  };
  const tests = [
    { args: [1], expected: 1 },
    { args: [2], expected: 2 },
  ];

  const mockExecute = async ({ source }) => {
    const nonce = (/ncc[a-f0-9]{24}/.exec(source) || ["ncc123"])[0];
    return {
      status: { id: 5, description: "Time Limit Exceeded" },
      stdout: `${nonce} 0 OK 1\n`, // test 0 finished, test 1 timed out
    };
  };

  const result = await grade({
    fn,
    tests,
    languageId: 71,
    code: "pass",
    mode: "run",
    execute: mockExecute,
  });

  assert.equal(result.status, "failed");
  assert.equal(result.tests[0].status, "passed");
  assert.equal(result.tests[1].status, "timeout");
});

test("grade.mjs - grade: validates unsupported language", async () => {
  const gridFn = {
    name: "matrixSum",
    params: [{ name: "grid", type: "int[][]" }],
    returns: "int",
  };
  const tests = [{ args: [[[1, 2], [3, 4]]], expected: 10 }];

  // C (language 50) does not support grids
  await assert.rejects(
    async () => {
      await grade({
        fn: gridFn,
        tests,
        languageId: 50, // C
        code: "int matrixSum() {}",
        mode: "run",
        execute: async () => {},
      });
    },
    (err) => err instanceof GradingError && err.message.includes("can't be solved in C")
  );
});
