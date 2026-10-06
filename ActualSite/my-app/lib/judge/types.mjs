// The test-case type system shared by every language harness.
//
// A challenge's `function` field describes the function members write:
//
//   "function": {
//     "name": "sum",
//     "params": [{ "name": "a", "type": "int" }, { "name": "b", "type": "int" }],
//     "returns": "int",
//     "anyOrder": false            // optional: true = a returned list may be in any order
//   }
//
// Types are a base type plus up to two "[]" suffixes:
//   int, long, double, bool, string, int[], string[], int[][], ...
//
// Test inputs travel to the program on stdin, and results come back on
// stdout, in a simple whitespace-separated token format that every language
// can read without a JSON library:
//   int / long   decimal digits            42  -7
//   double       decimal / exponent        0.5  1e-7
//   bool         1 or 0
//   string       hex of the UTF-8 bytes    68656c6c6f  ("-" for "")
//   T[]          length, then each item    3 1 2 3
//
// Plain module with no Next.js imports, so scripts can import it too.

export const BASE_TYPES = ["int", "long", "double", "bool", "string"];
export const MAX_DEPTH = 2;

const INT_MIN = -2147483648;
const INT_MAX = 2147483647;

export function parseType(text) {
  if (typeof text !== "string") return null;
  const match = /^(int|long|double|bool|string)((?:\[\])*)$/.exec(text.trim());
  if (!match) return null;
  const depth = match[2].length / 2;
  if (depth > MAX_DEPTH) return null;
  return { base: match[1], depth };
}

export function elementType(type) {
  return { base: type.base, depth: type.depth - 1 };
}

export function typeToString(type) {
  return type.base + "[]".repeat(type.depth);
}

// Words that can't be used as function or parameter names because they're
// reserved (or would clash with the harness) in at least one language.
const RESERVED = new Set(
  (
    "abstract and as assert async await auto base bool boolean break byte case catch char checked class " +
    "const continue crate decimal def default defer del delegate do double dyn elif else enum event " +
    "except explicit export extends extern false final finally fixed float fn for foreach from func " +
    "function global go goto if impl implicit import in int interface internal is lambda let lock long " +
    "loop main map match mod move mut namespace new nil none nonlocal not null object operator or out " +
    "override package params pass private protected pub public raise range readonly ref register " +
    "restrict return sbyte sealed select self short signed sizeof stackalloc static str string struct " +
    "super switch this throw trait true try type typedef typeof uint ulong unchecked union unsafe " +
    "unsigned use ushort using var virtual void volatile where while with yield vector std len print " +
    "solution system console args argc argv"
  ).split(/\s+/)
);

const IDENTIFIER = /^[A-Za-z][A-Za-z0-9_]*$/;

function checkName(name, what, errors) {
  if (typeof name !== "string" || !IDENTIFIER.test(name)) {
    errors.push(`${what} "${name}" must start with a letter and use only letters, digits and _.`);
    return;
  }
  if (RESERVED.has(name.toLowerCase())) {
    errors.push(`${what} "${name}" is a reserved word in one of the supported languages. Pick another name.`);
  }
}

// Checks that `value` (from the challenge JSON) fits `type`.
function checkValue(value, type, path, errors) {
  if (type.depth > 0) {
    if (!Array.isArray(value)) {
      errors.push(`${path} should be a list (${typeToString(type)}).`);
      return;
    }
    value.forEach((item, index) => checkValue(item, elementType(type), `${path}[${index}]`, errors));
    return;
  }
  switch (type.base) {
    case "int":
      if (!Number.isInteger(value) || value < INT_MIN || value > INT_MAX) {
        errors.push(`${path} should be a whole number between ${INT_MIN} and ${INT_MAX} (int).`);
      }
      break;
    case "long":
      if (!Number.isSafeInteger(value)) {
        errors.push(`${path} should be a whole number no bigger than ±9007199254740991 (long).`);
      }
      break;
    case "double":
      if (typeof value !== "number" || !Number.isFinite(value)) {
        errors.push(`${path} should be a number (double).`);
      }
      break;
    case "bool":
      if (typeof value !== "boolean") errors.push(`${path} should be true or false (bool).`);
      break;
    case "string":
      if (typeof value !== "string") errors.push(`${path} should be text in quotes (string).`);
      break;
  }
}

// Validates a challenge's `function` + `tests`. Returns a list of problems
// written for the person who pasted the challenge (empty = all good).
export function validateSpec(fn, tests) {
  const errors = [];
  if (!fn || typeof fn !== "object") return ["Missing the `function` description."];

  checkName(fn.name, "Function name", errors);
  if (!Array.isArray(fn.params)) {
    errors.push("`function.params` should be a list (use [] for no parameters).");
  } else {
    const seen = new Set();
    fn.params.forEach((param, index) => {
      checkName(param && param.name, `Parameter ${index + 1} name`, errors);
      if (param && seen.has(param.name)) errors.push(`Parameter name "${param.name}" is used twice.`);
      if (param) seen.add(param.name);
      if (param && param.name === fn.name) errors.push(`Parameter "${param.name}" has the same name as the function.`);
      if (!parseType(param && param.type)) {
        errors.push(`Parameter "${param && param.name}" has unknown type "${param && param.type}". Use int, long, double, bool, string, or add [] / [][].`);
      }
    });
  }
  const returnType = parseType(fn.returns);
  if (!returnType) {
    errors.push(`Return type "${fn.returns}" is unknown. Use int, long, double, bool, string, or add [] / [][].`);
  }
  if (fn.anyOrder !== undefined && typeof fn.anyOrder !== "boolean") {
    errors.push("`function.anyOrder` should be true or false.");
  }
  if (fn.anyOrder && returnType && returnType.depth === 0) {
    errors.push("`anyOrder` only makes sense when the function returns a list.");
  }
  if (errors.length) return errors;

  if (!Array.isArray(tests) || tests.length === 0) {
    errors.push("Add at least one test to `tests`.");
    return errors;
  }
  const paramTypes = fn.params.map((param) => parseType(param.type));
  tests.forEach((test, index) => {
    const label = `Test ${index + 1}`;
    if (!test || typeof test !== "object") {
      errors.push(`${label} should look like { "args": [...], "expected": ... }.`);
      return;
    }
    if (!Array.isArray(test.args)) {
      errors.push(`${label}: "args" should be a list with one value per parameter.`);
      return;
    }
    if (test.args.length !== paramTypes.length) {
      errors.push(`${label}: has ${test.args.length} args but the function takes ${paramTypes.length}.`);
      return;
    }
    test.args.forEach((arg, argIndex) =>
      checkValue(arg, paramTypes[argIndex], `${label} arg "${fn.params[argIndex].name}"`, errors)
    );
    if (!("expected" in test)) errors.push(`${label}: missing "expected".`);
    else checkValue(test.expected, returnType, `${label} "expected"`, errors);
    if (test.hidden !== undefined && typeof test.hidden !== "boolean") {
      errors.push(`${label}: "hidden" should be true or false.`);
    }
  });
  return errors;
}

// ---------- stdin encoding ----------

function utf8Hex(text) {
  let hex = "";
  for (const byte of new TextEncoder().encode(text)) hex += byte.toString(16).padStart(2, "0");
  return hex || "-";
}

function hexUtf8(token) {
  if (token === "-") return "";
  if (!/^(?:[0-9a-fA-F]{2})*$/.test(token)) throw new Error("bad string token");
  const bytes = new Uint8Array(token.length / 2);
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = parseInt(token.substr(i * 2, 2), 16);
  return new TextDecoder().decode(bytes);
}

function encodeValue(value, type, out) {
  if (type.depth > 0) {
    out.push(String(value.length));
    for (const item of value) encodeValue(item, elementType(type), out);
    return;
  }
  switch (type.base) {
    case "int":
    case "long":
      out.push(BigInt(value).toString());
      break;
    case "double":
      out.push(String(value));
      break;
    case "bool":
      out.push(value ? "1" : "0");
      break;
    case "string":
      out.push(utf8Hex(value));
      break;
  }
}

// stdin = number of tests, then each test's args (one test per line).
export function encodeInput(fn, tests) {
  const paramTypes = fn.params.map((param) => parseType(param.type));
  const lines = [String(tests.length)];
  for (const test of tests) {
    const tokens = [];
    test.args.forEach((arg, index) => encodeValue(arg, paramTypes[index], tokens));
    lines.push(tokens.join(" "));
  }
  return lines.join("\n") + "\n";
}

// ---------- stdout decoding ----------

function decodeValue(tokens, position, type) {
  if (position.i >= tokens.length) throw new Error("output ended early");
  if (type.depth > 0) {
    const length = Number(tokens[position.i++]);
    if (!Number.isInteger(length) || length < 0) throw new Error("bad list length");
    const items = [];
    for (let k = 0; k < length; k += 1) items.push(decodeValue(tokens, position, elementType(type)));
    return items;
  }
  const token = tokens[position.i++];
  switch (type.base) {
    case "int":
    case "long": {
      if (!/^-?\d+$/.test(token)) throw new Error("bad integer");
      return Number(token);
    }
    case "double": {
      const lower = token.toLowerCase();
      if (lower === "nan" || lower === "-nan") return NaN;
      if (lower === "inf" || lower === "infinity" || lower === "+inf") return Infinity;
      if (lower === "-inf" || lower === "-infinity") return -Infinity;
      const number = Number(token);
      if (Number.isNaN(number)) throw new Error("bad double");
      return number;
    }
    case "bool":
      if (token !== "1" && token !== "0") throw new Error("bad bool");
      return token === "1";
    case "string":
      return hexUtf8(token);
  }
  throw new Error("unknown type");
}

// Each harness prints one line per test:
//   <nonce> <index> OK <value tokens>
//   <nonce> <index> ERR <hex of error message>
// Any other line is the member's own printed output.
export function parseOutput(stdout, nonce, fn) {
  const returnType = parseType(fn.returns);
  const results = new Map();
  const otherLines = [];
  for (const line of String(stdout || "").split("\n")) {
    const trimmed = line.replace(/\r$/, "");
    if (!trimmed.startsWith(nonce + " ")) {
      otherLines.push(trimmed);
      continue;
    }
    const parts = trimmed.split(" ").filter((part) => part.length > 0);
    const index = Number(parts[1]);
    if (!Number.isInteger(index) || results.has(index)) continue;
    if (parts[2] === "ERR") {
      let message = "";
      try {
        message = hexUtf8(parts[3] || "-");
      } catch {
        message = "";
      }
      results.set(index, { status: "error", message });
    } else if (parts[2] === "OK") {
      try {
        const position = { i: 0 };
        const tokens = parts.slice(3);
        const value = decodeValue(tokens, position, returnType);
        results.set(index, { status: "ok", value });
      } catch {
        results.set(index, { status: "error", message: "Returned a value of the wrong type." });
      }
    }
  }
  while (otherLines.length && otherLines[otherLines.length - 1] === "") otherLines.pop();
  return { results, printed: otherLines.join("\n") };
}

// ---------- comparing answers ----------

const DOUBLE_TOLERANCE = 1e-6;

function canonical(value) {
  return JSON.stringify(value);
}

export function valuesEqual(actual, expected, type, anyOrder = false) {
  if (type.depth > 0) {
    if (!Array.isArray(actual) || actual.length !== expected.length) return false;
    let left = actual;
    let right = expected;
    if (anyOrder) {
      left = [...actual].sort((a, b) => (canonical(a) < canonical(b) ? -1 : canonical(a) > canonical(b) ? 1 : 0));
      right = [...expected].sort((a, b) => (canonical(a) < canonical(b) ? -1 : canonical(a) > canonical(b) ? 1 : 0));
    }
    return left.every((item, index) => valuesEqual(item, right[index], elementType(type), false));
  }
  if (type.base === "double") {
    if (typeof actual !== "number" || Number.isNaN(actual)) return false;
    if (!Number.isFinite(actual)) return actual === expected;
    const scale = Math.max(1, Math.abs(actual), Math.abs(expected));
    return Math.abs(actual - expected) <= DOUBLE_TOLERANCE * scale;
  }
  return actual === expected;
}

// How a value is shown to members, e.g. [1, 2, 3] or "hello".
export function formatValue(value) {
  if (Array.isArray(value)) return "[" + value.map(formatValue).join(", ") + "]";
  if (typeof value === "number" && !Number.isFinite(value)) return String(value);
  return JSON.stringify(value);
}

export function formatCall(fn, args) {
  return `${fn.name}(${args.map(formatValue).join(", ")})`;
}
