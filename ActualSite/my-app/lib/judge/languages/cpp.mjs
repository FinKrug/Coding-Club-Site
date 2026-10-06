// C++ (GCC 9.2, Judge0 language 54; default dialect gnu++14). Members write
// a plain function at file scope. The runner passes arguments as local
// variables, so `vector<int>& nums` and `vector<int> nums` both work.
import { parseType, elementType } from "../types.mjs";

function cppType(type) {
  if (type.depth > 0) return `vector<${cppType(elementType(type))}>`;
  return { int: "int", long: "long long", double: "double", bool: "bool", string: "string" }[type.base];
}

function fullType(type) {
  if (type.depth > 0) return `std::vector<${fullType(elementType(type))}>`;
  return { int: "int", long: "long long", double: "double", bool: "bool", string: "std::string" }[type.base];
}

function reader(type) {
  if (type.depth > 0) {
    return `ncc_h::readVec<${fullType(elementType(type))}>([]() { return ${reader(elementType(type))}; })`;
  }
  return {
    int: "(int)ncc_h::readLong()",
    long: "ncc_h::readLong()",
    double: "ncc_h::readDouble()",
    bool: "ncc_h::readBool()",
    string: "ncc_h::readString()",
  }[type.base];
}

function writer(type, value) {
  if (type.depth > 0) {
    const name = `x${type.depth}`;
    return `ncc_h::writeVec(${value}, [](const ${fullType(elementType(type))}& ${name}) { return ${writer(elementType(type), name)}; })`;
  }
  return {
    int: "ncc_h::writeLong",
    long: "ncc_h::writeLong",
    double: "ncc_h::writeDouble",
    bool: "ncc_h::writeBool",
    string: "ncc_h::writeString",
  }[type.base] + `(${value})`;
}

export const cpp = {
  supports: () => true,

  starter(fn) {
    const params = fn.params.map((p) => {
      const type = parseType(p.type);
      const spelled = cppType(type);
      return type.depth > 0 || type.base === "string" ? `${spelled}& ${p.name}` : `${spelled} ${p.name}`;
    });
    return `#include <bits/stdc++.h>\nusing namespace std;\n\n${cppType(parseType(fn.returns))} ${fn.name}(${params.join(", ")}) {\n    \n}\n`;
  },

  program(fn, code, nonce) {
    const returnType = parseType(fn.returns);
    const reads = fn.params
      .map((p, i) => `        ${fullType(parseType(p.type))} p${i} = ${reader(parseType(p.type))};`)
      .join("\n");
    const call = `${fn.name}(${fn.params.map((_, i) => `p${i}`).join(", ")})`;
    return `${code}

// ---- test runner added by the site (your code is above) ----
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <exception>
#include <functional>
#include <string>
#include <vector>

namespace ncc_h {
    static std::vector<char> data;
    static size_t pos = 0;

    static std::string next() {
        while (pos < data.size() && (unsigned char)data[pos] <= ' ') pos++;
        size_t start = pos;
        while (pos < data.size() && (unsigned char)data[pos] > ' ') pos++;
        return std::string(data.begin() + start, data.begin() + pos);
    }
    static long long readLong() { return std::strtoll(next().c_str(), nullptr, 10); }
    static double readDouble() { return std::strtod(next().c_str(), nullptr); }
    static bool readBool() { return next() == "1"; }
    static std::string readString() {
        std::string t = next();
        if (t == "-") return std::string();
        std::string out;
        for (size_t i = 0; i + 1 < t.size(); i += 2) out.push_back((char)std::strtol(t.substr(i, 2).c_str(), nullptr, 16));
        return out;
    }
    template <typename T>
    static std::vector<T> readVec(std::function<T()> item) {
        long long n = readLong();
        std::vector<T> v;
        v.reserve((size_t)n);
        for (long long i = 0; i < n; i++) v.push_back(item());
        return v;
    }
    static std::string hex(const std::string& s) {
        static const char* digits = "0123456789abcdef";
        std::string out;
        for (unsigned char c : s) { out.push_back(digits[c >> 4]); out.push_back(digits[c & 15]); }
        return out.empty() ? std::string("-") : out;
    }
    static std::string writeLong(long long v) { return std::to_string(v); }
    static std::string writeDouble(double v) { char buf[64]; std::snprintf(buf, sizeof buf, "%.17g", v); return buf; }
    static std::string writeBool(bool v) { return v ? "1" : "0"; }
    static std::string writeString(const std::string& v) { return hex(v); }
    template <typename T, typename F>
    static std::string writeVec(const std::vector<T>& v, F item) {
        std::string out = std::to_string(v.size());
        for (const T& x : v) { out.push_back(' '); out += item(x); }
        return out;
    }
}

int main() {
    char buffer[65536];
    size_t got;
    while ((got = std::fread(buffer, 1, sizeof buffer, stdin)) > 0) ncc_h::data.insert(ncc_h::data.end(), buffer, buffer + got);
    long long count = ncc_h::readLong();
    for (long long t = 0; t < count; t++) {
${reads}
        std::string line;
        try {
            ${fullType(returnType)} out = ${call};
            line = std::string("${nonce} ") + std::to_string(t) + " OK " + ${writer(returnType, "out")};
        } catch (const std::exception& e) {
            line = std::string("${nonce} ") + std::to_string(t) + " ERR " + ncc_h::hex(std::string("exception: ") + e.what());
        } catch (...) {
            line = std::string("${nonce} ") + std::to_string(t) + " ERR " + ncc_h::hex("an exception was thrown");
        }
        std::fputs(line.c_str(), stdout);
        std::fputc('\\n', stdout);
        std::fflush(stdout);
    }
    return 0;
}
`;
  },
};
