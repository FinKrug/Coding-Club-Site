// JavaScript (Node.js 12, Judge0 language 63) and TypeScript (3.7, Judge0
// language 74, compiled with plain `tsc` so it targets ES3 with the ES5 library).
// The runner below sticks to ES5 library calls and reaches Node's globals
// through eval() so it type-checks without @types/node.
import { parseType, elementType } from "../types.mjs";

function tsType(type) {
  if (type.depth > 0) return `${tsType(elementType(type))}[]`;
  return { int: "number", long: "number", double: "number", bool: "boolean", string: "string" }[type.base];
}

function reader(type) {
  if (type.depth > 0) return `__rl(function () { return ${reader(elementType(type))}; })`;
  return { int: "__ri()", long: "__ri()", double: "__rd()", bool: "__rb()", string: "__rs()" }[type.base];
}

function writer(type, value) {
  if (type.depth > 0) {
    const name = `__x${type.depth}`;
    return `__wl(function (${name}) { return ${writer(elementType(type), name)}; }, ${value})`;
  }
  return { int: "__wi", long: "__wi", double: "__wd", bool: "__wb", string: "__ws" }[type.base] + `(${value})`;
}

function program(fn, code, nonce) {
  const args = fn.params.map((p) => reader(parseType(p.type))).join(", ");
  return `${code}

// ---- test runner added by the site (your code is above) ----
;(function () {
  var __req = eval("require");
  var __proc = eval("process");
  var __Buf = eval("Buffer");
  var __tok = String(__req("fs").readFileSync(0, "utf8")).split(/\\s+/).filter(function (t) { return t.length > 0; });
  var __p = 0;
  function __next() { return __tok[__p++]; }
  function __ri() { return Number(__next()); }
  function __rd() { return Number(__next()); }
  function __rb() { return __next() === "1"; }
  function __rs() { var t = __next(); return t === "-" ? "" : __Buf.from(t, "hex").toString("utf8"); }
  function __rl(item) { var n = Number(__next()); var out = []; for (var k = 0; k < n; k++) { out.push(item()); } return out; }
  function __kind(v) { return v === null ? "null" : Array.isArray(v) ? "array" : typeof v; }
  function __bad(v, want) { return new TypeError("returned " + __kind(v) + ", expected " + want); }
  function __wi(v) { if (typeof v !== "number" || !isFinite(v) || Math.floor(v) !== v) { throw __bad(v, "a whole number"); } return v.toFixed(0); }
  function __wd(v) { if (typeof v !== "number") { throw __bad(v, "number"); } return String(v); }
  function __wb(v) { if (typeof v !== "boolean") { throw __bad(v, "boolean"); } return v ? "1" : "0"; }
  function __ws(v) { if (typeof v !== "string") { throw __bad(v, "string"); } return __Buf.from(v, "utf8").toString("hex") || "-"; }
  function __wl(item, v) { if (!Array.isArray(v)) { throw __bad(v, "array"); } var parts = [String(v.length)]; for (var k = 0; k < v.length; k++) { parts.push(item(v[k])); } return parts.join(" "); }
  var __count = __ri();
  for (var __i = 0; __i < __count; __i++) {
    var __args = [${args}];
    var __line;
    try {
      if (typeof ${fn.name} !== "function") { throw new ReferenceError("couldn't find a function named ${fn.name} (check the spelling)"); }
      var __out = (${fn.name} as any).apply(null, __args);
      __line = "${nonce} " + __i + " OK " + ${writer(parseType(fn.returns), "__out")};
    } catch (__e) {
      var __msg = String(__e && __e.name && __e.message !== undefined ? __e.name + ": " + __e.message : __e).slice(0, 500);
      __line = "${nonce} " + __i + " ERR " + (__Buf.from(__msg, "utf8").toString("hex") || "-");
    }
    __proc.stdout.write(__line + "\\n");
  }
})();
`;
}

export const javascript = {
  supports: () => true,

  starter(fn) {
    const doc = [
      "/**",
      ...fn.params.map((p) => ` * @param {${tsType(parseType(p.type))}} ${p.name}`),
      ` * @return {${tsType(parseType(fn.returns))}}`,
      " */",
    ].join("\n");
    return `${doc}\nfunction ${fn.name}(${fn.params.map((p) => p.name).join(", ")}) {\n    \n}\n`;
  },

  // Plain JS can't contain the TypeScript "as any" cast.
  program: (fn, code, nonce) => program(fn, code, nonce).replace(`(${fn.name} as any).apply`, `${fn.name}.apply`),
};

export const typescript = {
  supports: () => true,

  starter(fn) {
    const params = fn.params.map((p) => `${p.name}: ${tsType(parseType(p.type))}`).join(", ");
    return `function ${fn.name}(${params}): ${tsType(parseType(fn.returns))} {\n    \n}\n`;
  },

  program,
};
