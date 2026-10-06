// Go (1.13, Judge0 language 60). Go needs every import at the top of the
// file, so the runner rewrites the member's `package main` line to also
// import what the runner needs, merged with their own imports. Their import
// lines are blanked rather than removed, so compiler line numbers still
// match what they see in the editor.
import { parseType, elementType } from "../types.mjs";

const RUNNER_IMPORTS = ["encoding/hex", "fmt", "io/ioutil", "os", "strconv", "strings"];

function goType(type) {
  if (type.depth > 0) return `[]${goType(elementType(type))}`;
  return { int: "int", long: "int64", double: "float64", bool: "bool", string: "string" }[type.base];
}

function reader(type, depth = 0) {
  if (type.depth === 0) {
    return { int: "int(nccInt())", long: "nccInt()", double: "nccFloat()", bool: "nccBool()", string: "nccString()" }[type.base];
  }
  const t = goType(type);
  return `func() ${t} { n${depth} := int(nccInt()); s${depth} := make(${t}, n${depth}); for k${depth} := range s${depth} { s${depth}[k${depth}] = ${reader(elementType(type), depth + 1)} }; return s${depth} }()`;
}

// Writers are statements that append tokens to the `w` slice.
function writer(type, value, depth = 0) {
  if (type.depth === 0) {
    return {
      int: `w = append(w, strconv.FormatInt(int64(${value}), 10))`,
      long: `w = append(w, strconv.FormatInt(${value}, 10))`,
      double: `w = append(w, strconv.FormatFloat(${value}, 'g', -1, 64))`,
      bool: `if ${value} { w = append(w, "1") } else { w = append(w, "0") }`,
      string: `w = append(w, nccHex(${value}))`,
    }[type.base];
  }
  const item = `x${depth}`;
  return `w = append(w, strconv.Itoa(len(${value}))); for _, ${item} := range ${value} { ${writer(elementType(type), item, depth + 1)} }`;
}

// Pulls `import "x"`, `import alias "x"` and `import ( ... )` out of the
// member's code. Returns the import specs and the code with those lines
// replaced by blank lines.
function extractImports(code) {
  const specs = [];
  const blank = (text) => text.replace(/[^\n]/g, "");
  let rest = code.replace(/^[ \t]*import[ \t]*\(([\s\S]*?)\)/gm, (match, body) => {
    for (const line of body.split("\n")) {
      const spec = line.replace(/\/\/.*$/, "").trim();
      if (spec) specs.push(spec);
    }
    return blank(match);
  });
  rest = rest.replace(/^[ \t]*import[ \t]+([^\n(]*"[^"\n]+")[ \t]*(\/\/[^\n]*)?$/gm, (match, spec) => {
    specs.push(spec.trim());
    return "";
  });
  return { specs, rest };
}

export const go = {
  supports: () => true,

  starter(fn) {
    const params = fn.params.map((p) => `${p.name} ${goType(parseType(p.type))}`).join(", ");
    return `package main\n\nfunc ${fn.name}(${params}) ${goType(parseType(fn.returns))} {\n    \n}\n`;
  },

  program(fn, code, nonce) {
    const { specs, rest } = extractImports(code);
    const all = [...RUNNER_IMPORTS.map((path) => `"${path}"`)];
    for (const spec of specs) {
      const normalized = spec.replace(/\s+/g, " ");
      if (!all.includes(normalized)) all.push(normalized);
    }
    const header = `package main; import (${all.join("; ")})`;
    let body;
    if (/^[ \t]*package[ \t]+main[ \t]*$/m.test(rest)) {
      body = rest.replace(/^[ \t]*package[ \t]+main[ \t]*$/m, header);
    } else {
      body = `${header}\n${rest}`;
    }

    const returnType = parseType(fn.returns);
    const reads = fn.params
      .map((p, i) => `\t\tp${i} := ${reader(parseType(p.type))}`)
      .join("\n");
    const call = `${fn.name}(${fn.params.map((_, i) => `p${i}`).join(", ")})`;
    return `${body}

// ---- test runner added by the site (your code is above) ----
var nccTokens []string
var nccPos int

func nccNext() string {
	if nccPos >= len(nccTokens) {
		return "0"
	}
	nccPos++
	return nccTokens[nccPos-1]
}
func nccInt() int64 { v, _ := strconv.ParseInt(nccNext(), 10, 64); return v }
func nccFloat() float64 { v, _ := strconv.ParseFloat(nccNext(), 64); return v }
func nccBool() bool { return nccNext() == "1" }
func nccString() string {
	t := nccNext()
	if t == "-" {
		return ""
	}
	b, _ := hex.DecodeString(t)
	return string(b)
}
func nccHex(s string) string {
	if s == "" {
		return "-"
	}
	return hex.EncodeToString([]byte(s))
}

func main() {
	input, _ := ioutil.ReadAll(os.Stdin)
	nccTokens = strings.Fields(string(input))
	count := int(nccInt())
	for t := 0; t < count; t++ {
${reads}
		line := ""
		func() {
			defer func() {
				if r := recover(); r != nil {
					msg := fmt.Sprint("panic: ", r)
					if len(msg) > 500 {
						msg = msg[:500]
					}
					line = fmt.Sprintf("${nonce} %d ERR %s", t, nccHex(msg))
				}
			}()
			out := ${call}
			w := []string{}
			${writer(returnType, "out")}
			line = fmt.Sprintf("${nonce} %d OK %s", t, strings.Join(w, " "))
		}()
		fmt.Println(line)
	}
}
`;
  },
};
