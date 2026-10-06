// Java (OpenJDK 13, Judge0 language 62). The file is compiled as Main.java,
// so members write a non-public `class Solution` and the runner adds
// `public class Main`. The runner uses fully qualified names, so members can
// add whatever imports they like at the top.
import { parseType, elementType } from "../types.mjs";

function javaType(type) {
  if (type.depth > 0) return `${javaType(elementType(type))}[]`;
  return { int: "int", long: "long", double: "double", bool: "boolean", string: "String" }[type.base];
}

// Reading arrays: build an expression that reads `type` from the token reader.
function reader(type, depth = 0) {
  if (type.depth === 0) {
    return { int: "NccH.ri()", long: "NccH.rl()", double: "NccH.rd()", bool: "NccH.rb()", string: "NccH.rs()" }[type.base];
  }
  const inner = elementType(type);
  // Java can't write `new int[n][]` generically from a helper, so inline it.
  const n = `n${depth}`;
  const arr = `a${depth}`;
  const k = `k${depth}`;
  const base = javaType({ base: type.base, depth: 0 });
  const dims = "[]".repeat(type.depth - 1);
  return `((java.util.function.Supplier<${javaType(type)}>) () -> { int ${n} = NccH.ri(); ${javaType(type)} ${arr} = new ${base}[${n}]${dims}; for (int ${k} = 0; ${k} < ${n}; ${k}++) { ${arr}[${k}] = ${reader(inner, depth + 1)}; } return ${arr}; }).get()`;
}

function writer(type, value, depth = 0) {
  if (type.depth === 0) {
    return { int: `NccH.w(${value})`, long: `NccH.w(${value})`, double: `NccH.wd(${value})`, bool: `NccH.wb(${value})`, string: `NccH.ws(${value})` }[type.base];
  }
  const item = `x${depth}`;
  // StringBuilder-based join; null arrays are reported as errors.
  return `NccH.wa(${value}, ${value} == null ? 0 : ${value}.length, (java.util.function.IntFunction<String>) (int i${depth}) -> { ${javaType(elementType(type))} ${item} = ${value}[i${depth}]; return ${writer(elementType(type), item, depth + 1)}; })`;
}

export const java = {
  supports: () => true,

  starter(fn) {
    const params = fn.params.map((p) => `${javaType(parseType(p.type))} ${p.name}`).join(", ");
    return `import java.util.*;\n\nclass Solution {\n    public ${javaType(parseType(fn.returns))} ${fn.name}(${params}) {\n        \n    }\n}\n`;
  },

  program(fn, code, nonce) {
    const reads = fn.params
      .map((p, i) => `            ${javaType(parseType(p.type))} p${i} = ${reader(parseType(p.type))};`)
      .join("\n");
    const call = `new Solution().${fn.name}(${fn.params.map((_, i) => `p${i}`).join(", ")})`;
    const returnType = parseType(fn.returns);
    return `${code}

// ---- test runner added by the site (your code is above) ----
class NccH {
    static byte[] data;
    static int pos = 0;

    static String next() {
        while (pos < data.length && data[pos] <= ' ') pos++;
        int start = pos;
        while (pos < data.length && data[pos] > ' ') pos++;
        return new String(data, start, pos - start, java.nio.charset.StandardCharsets.US_ASCII);
    }
    static int ri() { return Integer.parseInt(next()); }
    static long rl() { return Long.parseLong(next()); }
    static double rd() { return Double.parseDouble(next()); }
    static boolean rb() { return next().equals("1"); }
    static String rs() {
        String t = next();
        if (t.equals("-")) return "";
        byte[] b = new byte[t.length() / 2];
        for (int i = 0; i < b.length; i++) b[i] = (byte) Integer.parseInt(t.substring(2 * i, 2 * i + 2), 16);
        return new String(b, java.nio.charset.StandardCharsets.UTF_8);
    }
    static String hex(String s) {
        byte[] b = s.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        StringBuilder sb = new StringBuilder();
        for (byte x : b) sb.append(String.format("%02x", x & 0xff));
        return sb.length() == 0 ? "-" : sb.toString();
    }
    static String w(long v) { return Long.toString(v); }
    static String wd(double v) { return Double.toString(v); }
    static String wb(boolean v) { return v ? "1" : "0"; }
    static String ws(String v) {
        if (v == null) throw new NullPointerException("returned null instead of a String");
        return hex(v);
    }
    static String wa(Object arr, int n, java.util.function.IntFunction<String> item) {
        if (arr == null) throw new NullPointerException("returned null instead of an array");
        StringBuilder sb = new StringBuilder(Integer.toString(n));
        for (int i = 0; i < n; i++) sb.append(' ').append(item.apply(i));
        return sb.toString();
    }
}

public class Main {
    public static void main(String[] args) throws Exception {
        NccH.data = System.in.readAllBytes();
        int count = NccH.ri();
        for (int t = 0; t < count; t++) {
${reads}
            String line;
            try {
                ${javaType(returnType)} out = ${call};
                line = "${nonce} " + t + " OK " + ${writer(returnType, "out")};
            } catch (Throwable e) {
                String msg = e.toString();
                if (msg.length() > 500) msg = msg.substring(0, 500);
                line = "${nonce} " + t + " ERR " + NccH.hex(msg);
            }
            System.out.println(line);
            System.out.flush();
        }
    }
}
`;
  },
};
