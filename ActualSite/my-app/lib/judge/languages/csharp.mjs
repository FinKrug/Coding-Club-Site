// C# (Mono 6.6, Judge0 language 51). Members write `public class Solution`
// with the method in it. The runner finds the method with reflection, so it
// works whether they make it static or not, and it uses fully qualified
// names so members can put any `using` lines at the top.
import { parseType, elementType } from "../types.mjs";

function csType(type) {
  if (type.depth > 0) return `${csType(elementType(type))}[]`;
  return { int: "int", long: "long", double: "double", bool: "bool", string: "string" }[type.base];
}

function reader(type) {
  if (type.depth > 0) return `NccH.Ra<${csType(elementType(type))}>(() => ${reader(elementType(type))})`;
  return { int: "NccH.Ri()", long: "NccH.Rl()", double: "NccH.Rd()", bool: "NccH.Rb()", string: "NccH.Rs()" }[type.base];
}

function writer(type, value) {
  if (type.depth > 0) {
    const name = `x${type.depth}`;
    return `NccH.Wa<${csType(elementType(type))}>(${value}, ${name} => ${writer(elementType(type), name)})`;
  }
  return { int: "NccH.Wl", long: "NccH.Wl", double: "NccH.Wd", bool: "NccH.Wb", string: "NccH.Ws" }[type.base] + `(${value})`;
}

export const csharp = {
  supports: () => true,

  starter(fn) {
    const params = fn.params.map((p) => `${csType(parseType(p.type))} ${p.name}`).join(", ");
    return `using System;\nusing System.Collections.Generic;\nusing System.Linq;\n\npublic class Solution {\n    public ${csType(parseType(fn.returns))} ${fn.name}(${params}) {\n        \n    }\n}\n`;
  },

  program(fn, code, nonce) {
    const returnType = parseType(fn.returns);
    const args = fn.params.map((p) => `(object)${reader(parseType(p.type))}`).join(", ");
    return `${code}

// ---- test runner added by the site (your code is above) ----
public static class NccH {
    static string[] tok;
    static int pos = 0;
    public static void Init() {
        tok = System.Console.In.ReadToEnd().Split((char[])null, System.StringSplitOptions.RemoveEmptyEntries);
    }
    static string Next() { return tok[pos++]; }
    static System.Globalization.CultureInfo Inv { get { return System.Globalization.CultureInfo.InvariantCulture; } }
    public static int Ri() { return int.Parse(Next(), Inv); }
    public static long Rl() { return long.Parse(Next(), Inv); }
    public static double Rd() { return double.Parse(Next(), System.Globalization.NumberStyles.Float, Inv); }
    public static bool Rb() { return Next() == "1"; }
    public static string Rs() {
        string t = Next();
        if (t == "-") return "";
        byte[] b = new byte[t.Length / 2];
        for (int i = 0; i < b.Length; i++) b[i] = System.Convert.ToByte(t.Substring(2 * i, 2), 16);
        return System.Text.Encoding.UTF8.GetString(b);
    }
    public static T[] Ra<T>(System.Func<T> item) {
        int n = Ri();
        T[] a = new T[n];
        for (int i = 0; i < n; i++) a[i] = item();
        return a;
    }
    public static string Hex(string s) {
        byte[] b = System.Text.Encoding.UTF8.GetBytes(s);
        var sb = new System.Text.StringBuilder();
        foreach (byte x in b) sb.Append(x.ToString("x2"));
        return sb.Length == 0 ? "-" : sb.ToString();
    }
    public static string Wl(long v) { return v.ToString(Inv); }
    public static string Wd(double v) { return v.ToString("R", Inv); }
    public static string Wb(bool v) { return v ? "1" : "0"; }
    public static string Ws(string v) {
        if (v == null) throw new System.NullReferenceException("returned null instead of a string");
        return Hex(v);
    }
    public static string Wa<T>(T[] a, System.Func<T, string> item) {
        if (a == null) throw new System.NullReferenceException("returned null instead of an array");
        var sb = new System.Text.StringBuilder(a.Length.ToString(Inv));
        foreach (T x in a) sb.Append(' ').Append(item(x));
        return sb.ToString();
    }
    public static T Expect<T>(object v, string name) {
        if (v is T) return (T)v;
        string got = v == null ? "null" : v.GetType().Name;
        throw new System.InvalidCastException("returned " + got + ", expected " + name);
    }
}

public static class NccMain {
    public static void Main() {
        NccH.Init();
        var flags = System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic
            | System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.Instance;
        System.Reflection.MethodInfo method = typeof(Solution).GetMethod("${fn.name}", flags);
        int count = NccH.Ri();
        for (int t = 0; t < count; t++) {
            object[] args = new object[] { ${args} };
            string line;
            try {
                if (method == null) {
                    throw new System.MissingMethodException("couldn't find a method named ${fn.name} in class Solution");
                }
                object target = method.IsStatic ? null : System.Activator.CreateInstance(typeof(Solution), true);
                object result;
                try {
                    result = method.Invoke(target, args);
                } catch (System.Reflection.TargetInvocationException wrapped) {
                    if (wrapped.InnerException != null) throw wrapped.InnerException;
                    throw;
                }
                ${csType(returnType)} typed = NccH.Expect<${csType(returnType)}>(result, "${csType(returnType)}");
                line = "${nonce} " + t + " OK " + ${writer(returnType, "typed")};
            } catch (System.Exception e) {
                string msg = e.GetType().Name + ": " + e.Message;
                if (msg.Length > 500) msg = msg.Substring(0, 500);
                line = "${nonce} " + t + " ERR " + NccH.Hex(msg);
            }
            System.Console.Out.WriteLine(line);
            System.Console.Out.Flush();
        }
    }
}
`;
  },
};
