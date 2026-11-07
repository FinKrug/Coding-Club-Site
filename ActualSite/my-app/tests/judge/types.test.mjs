import test from "node:test";
import assert from "node:assert/strict";
import {
  parseType,
  elementType,
  typeToString,
  validateSpec,
  encodeInput,
  parseOutput,
  valuesEqual,
  formatValue,
  formatCall,
} from "../../lib/judge/types.mjs";

test("types.mjs - parseType", () => {
  assert.deepEqual(parseType("int"), { base: "int", depth: 0 });
  assert.deepEqual(parseType("long"), { base: "long", depth: 0 });
  assert.deepEqual(parseType("double"), { base: "double", depth: 0 });
  assert.deepEqual(parseType("bool"), { base: "bool", depth: 0 });
  assert.deepEqual(parseType("string"), { base: "string", depth: 0 });
  assert.deepEqual(parseType("int[]"), { base: "int", depth: 1 });
  assert.deepEqual(parseType("string[][]"), { base: "string", depth: 2 });

  // Rejects depth > 2
  assert.equal(parseType("int[][][]"), null);
  // Rejects invalid types
  assert.equal(parseType("float"), null);
  assert.equal(parseType("object"), null);
  assert.equal(parseType(""), null);
  assert.equal(parseType(null), null);
  assert.equal(parseType(123), null);
});

test("types.mjs - elementType & typeToString", () => {
  const type2d = parseType("int[][]");
  const type1d = elementType(type2d);
  assert.deepEqual(type1d, { base: "int", depth: 1 });
  assert.equal(typeToString(type2d), "int[][]");
  assert.equal(typeToString(type1d), "int[]");
  assert.equal(typeToString(elementType(type1d)), "int");
});

test("types.mjs - validateSpec: valid specifications", () => {
  const validFn = {
    name: "addNumbers",
    params: [
      { name: "a", type: "int" },
      { name: "b", type: "int" },
    ],
    returns: "int",
  };
  const validTests = [
    { args: [1, 2], expected: 3 },
    { args: [-5, 10], expected: 5, hidden: true },
  ];
  assert.deepEqual(validateSpec(validFn, validTests), []);
});

test("types.mjs - validateSpec: rejects reserved words and invalid names", () => {
  const badFn = {
    name: "class",
    params: [{ name: "return", type: "int" }],
    returns: "int",
  };
  const tests = [{ args: [1], expected: 1 }];
  const errors = validateSpec(badFn, tests);
  assert.ok(errors.some((e) => e.includes("reserved word")));
});

test("types.mjs - validateSpec: duplicate parameter names & name collisions", () => {
  const dupParamFn = {
    name: "myFunc",
    params: [
      { name: "x", type: "int" },
      { name: "x", type: "int" },
    ],
    returns: "int",
  };
  const errors = validateSpec(dupParamFn, [{ args: [1, 2], expected: 3 }]);
  assert.ok(errors.some((e) => e.includes("used twice")));

  const nameCollideFn = {
    name: "tester",
    params: [{ name: "tester", type: "int" }],
    returns: "int",
  };
  const collideErrors = validateSpec(nameCollideFn, [{ args: [1], expected: 1 }]);
  assert.ok(collideErrors.some((e) => e.includes("same name as the function")));
});

test("types.mjs - validateSpec: test argument & expected type mismatch", () => {
  const fn = {
    name: "multiply",
    params: [{ name: "s", type: "string" }],
    returns: "int",
  };
  // Wrong arg type and wrong expected type
  const badTests = [
    { args: [123], expected: "not an int" },
  ];
  const errors = validateSpec(fn, badTests);
  assert.ok(errors.some((e) => e.includes("should be text in quotes")));
  assert.ok(errors.some((e) => e.includes("should be a whole number")));
});

test("types.mjs - encodeInput", () => {
  const fn = {
    name: "concat",
    params: [
      { name: "prefix", type: "string" },
      { name: "numbers", type: "int[]" },
      { name: "flag", type: "bool" },
    ],
    returns: "string",
  };
  const tests = [
    { args: ["hi", [1, 2, 3], true], expected: "hi123" },
    { args: ["", [], false], expected: "" },
  ];
  const encoded = encodeInput(fn, tests);
  const lines = encoded.trim().split("\n");
  assert.equal(lines[0], "2"); // 2 tests
  // "hi" is 6869, array is length 3 then 1 2 3, bool is 1
  assert.equal(lines[1], "6869 3 1 2 3 1");
  // "" is "-", empty array is 0, bool is 0
  assert.equal(lines[2], "- 0 0");
});

test("types.mjs - parseOutput: parses results and separates printed stdout", () => {
  const fn = {
    name: "calculate",
    params: [{ name: "x", type: "int" }],
    returns: "int",
  };
  const nonce = "ncc12345";
  const stdout = [
    "Debugging line 1",
    `${nonce} 0 OK 42`,
    "User logged this",
    `${nonce} 1 ERR 626164206572726f72`, // "bad error" in hex
    "Trailing debug output",
  ].join("\n");

  const { results, printed } = parseOutput(stdout, nonce, fn);
  assert.equal(results.get(0).status, "ok");
  assert.equal(results.get(0).value, 42);
  assert.equal(results.get(1).status, "error");
  assert.equal(results.get(1).message, "bad error");
  assert.equal(
    printed,
    "Debugging line 1\nUser logged this\nTrailing debug output"
  );
});

test("types.mjs - valuesEqual: primitives, arrays, double tolerance & anyOrder", () => {
  const intType = parseType("int");
  assert.equal(valuesEqual(42, 42, intType), true);
  assert.equal(valuesEqual(42, 43, intType), false);

  const doubleType = parseType("double");
  assert.equal(valuesEqual(1.0000001, 1.0, doubleType), true);
  assert.equal(valuesEqual(1.001, 1.0, doubleType), false);
  assert.equal(valuesEqual(Infinity, Infinity, doubleType), true);
  assert.equal(valuesEqual(-Infinity, Infinity, doubleType), false);

  const arrayType = parseType("int[]");
  assert.equal(valuesEqual([1, 2, 3], [1, 2, 3], arrayType), true);
  assert.equal(valuesEqual([1, 2], [1, 2, 3], arrayType), false);

  // anyOrder testing
  assert.equal(valuesEqual([3, 1, 2], [1, 2, 3], arrayType, false), false);
  assert.equal(valuesEqual([3, 1, 2], [1, 2, 3], arrayType, true), true);
});

test("types.mjs - formatValue & formatCall", () => {
  assert.equal(formatValue(42), "42");
  assert.equal(formatValue("test"), '"test"');
  assert.equal(formatValue([1, "a"]), '[1, "a"]');

  const fn = { name: "myFunc" };
  assert.equal(formatCall(fn, [10, "hello"]), 'myFunc(10, "hello")');
});
