// Rust (1.40, Judge0 language 73; compiled with plain `rustc`, so the 2015
// edition). Members write a free function. The runner avoids anything newer
// than Rust 1.40 and works in both the 2015 and 2018 editions.
import { parseType, elementType } from "../types.mjs";

function rustType(type) {
  if (type.depth > 0) return `Vec<${rustType(elementType(type))}>`;
  return { int: "i32", long: "i64", double: "f64", bool: "bool", string: "String" }[type.base];
}

export const rust = {
  supports: () => true,

  starter(fn) {
    const params = fn.params.map((p) => `${p.name}: ${rustType(parseType(p.type))}`).join(", ");
    return `fn ${fn.name}(${params}) -> ${rustType(parseType(fn.returns))} {\n    \n}\n`;
  },

  program(fn, code, nonce) {
    const returnType = parseType(fn.returns);
    const reads = fn.params
      .map((p, i) => `        let p${i}: ${rustType(parseType(p.type))} = NccRead::ncc_read(&mut toks);`)
      .join("\n");
    const call = `${fn.name}(${fn.params.map((_, i) => `p${i}`).join(", ")})`;
    return `${code}

// ---- test runner added by the site (your code is above) ----
trait NccRead { fn ncc_read(t: &mut ::std::str::SplitAsciiWhitespace) -> Self; }
trait NccWrite { fn ncc_write(&self, out: &mut String); }

fn ncc_tok<'a>(t: &mut ::std::str::SplitAsciiWhitespace<'a>) -> &'a str { t.next().unwrap_or("0") }
fn ncc_hex(s: &str) -> String {
    let mut out = String::new();
    for b in s.bytes() { out.push_str(&format!("{:02x}", b)); }
    if out.is_empty() { out.push('-'); }
    out
}

impl NccRead for i32 { fn ncc_read(t: &mut ::std::str::SplitAsciiWhitespace) -> Self { ncc_tok(t).parse().unwrap() } }
impl NccRead for i64 { fn ncc_read(t: &mut ::std::str::SplitAsciiWhitespace) -> Self { ncc_tok(t).parse().unwrap() } }
impl NccRead for f64 { fn ncc_read(t: &mut ::std::str::SplitAsciiWhitespace) -> Self { ncc_tok(t).parse().unwrap() } }
impl NccRead for bool { fn ncc_read(t: &mut ::std::str::SplitAsciiWhitespace) -> Self { ncc_tok(t) == "1" } }
impl NccRead for String {
    fn ncc_read(t: &mut ::std::str::SplitAsciiWhitespace) -> Self {
        let s = ncc_tok(t);
        if s == "-" { return String::new(); }
        let mut bytes = Vec::new();
        let mut i = 0;
        while i + 1 < s.len() { bytes.push(u8::from_str_radix(&s[i..i + 2], 16).unwrap()); i += 2; }
        String::from_utf8_lossy(&bytes).into_owned()
    }
}
impl<T: NccRead> NccRead for Vec<T> {
    fn ncc_read(t: &mut ::std::str::SplitAsciiWhitespace) -> Self {
        let n: usize = ncc_tok(t).parse().unwrap();
        let mut v = Vec::with_capacity(n);
        for _ in 0..n { v.push(T::ncc_read(t)); }
        v
    }
}

impl NccWrite for i32 { fn ncc_write(&self, out: &mut String) { out.push_str(&self.to_string()); } }
impl NccWrite for i64 { fn ncc_write(&self, out: &mut String) { out.push_str(&self.to_string()); } }
impl NccWrite for f64 { fn ncc_write(&self, out: &mut String) { out.push_str(&format!("{:?}", self)); } }
impl NccWrite for bool { fn ncc_write(&self, out: &mut String) { out.push_str(if *self { "1" } else { "0" }); } }
impl NccWrite for String { fn ncc_write(&self, out: &mut String) { out.push_str(&ncc_hex(self)); } }
impl<T: NccWrite> NccWrite for Vec<T> {
    fn ncc_write(&self, out: &mut String) {
        out.push_str(&self.len().to_string());
        for x in self.iter() { out.push(' '); x.ncc_write(out); }
    }
}

fn main() {
    use std::io::Read;
    let mut input = String::new();
    ::std::io::stdin().read_to_string(&mut input).unwrap();
    let mut toks = input.split_ascii_whitespace();
    ::std::panic::set_hook(Box::new(|_| {}));
    let count: usize = ncc_tok(&mut toks).parse().unwrap();
    for t in 0..count {
${reads}
        let result = ::std::panic::catch_unwind(::std::panic::AssertUnwindSafe(move || -> ${rustType(returnType)} { ${call} }));
        let line = match result {
            Ok(value) => {
                let mut out = String::new();
                value.ncc_write(&mut out);
                format!("${nonce} {} OK {}", t, out)
            }
            Err(payload) => {
                let msg = if let Some(s) = payload.downcast_ref::<&str>() {
                    s.to_string()
                } else if let Some(s) = payload.downcast_ref::<String>() {
                    s.clone()
                } else {
                    "panicked".to_string()
                };
                let mut msg = format!("panicked: {}", msg);
                if msg.len() > 500 { let mut cut = 500; while !msg.is_char_boundary(cut) { cut -= 1; } msg.truncate(cut); }
                format!("${nonce} {} ERR {}", t, ncc_hex(&msg))
            }
        };
        println!("{}", line);
    }
}
`;
  },
};
