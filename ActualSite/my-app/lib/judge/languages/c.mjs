// C (GCC 9.2, Judge0 language 50; default dialect gnu11). Uses the
// LeetCode-style C conventions:
//   - an array parameter `int[] nums` becomes `int* nums, int numsSize`
//   - a string is `char*`, a string array is `char**`
//   - a function returning an array gets an extra `int* returnSize` it must set
// Grids ([][]) aren't supported in C.
import { parseType } from "../types.mjs";

const SCALAR = { int: "int", long: "long long", double: "double", bool: "bool", string: "char*" };

function paramDecl(p) {
  const type = parseType(p.type);
  if (type.depth === 0) return `${SCALAR[type.base]} ${p.name}`;
  return `${SCALAR[type.base]}* ${p.name}, int ${p.name}Size`;
}

function returnDecl(fn) {
  const type = parseType(fn.returns);
  return type.depth === 0 ? SCALAR[type.base] : `${SCALAR[type.base]}*`;
}

const READ = {
  int: "(int)ncc_read_long()",
  long: "ncc_read_long()",
  double: "ncc_read_double()",
  bool: "ncc_read_long() == 1",
  string: "ncc_read_string()",
};

const WRITE = {
  int: "ncc_write_long",
  long: "ncc_write_long",
  double: "ncc_write_double",
  bool: "ncc_write_bool",
  string: "ncc_write_string",
};

export const c = {
  supports(fn) {
    return [fn.returns, ...fn.params.map((p) => p.type)].every((t) => parseType(t).depth <= 1);
  },

  starter(fn) {
    const params = fn.params.map(paramDecl);
    if (parseType(fn.returns).depth > 0) params.push("int* returnSize");
    const note =
      parseType(fn.returns).depth > 0
        ? "/* Return a malloc'd array and set *returnSize to its length. */\n"
        : "";
    return `#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n#include <stdbool.h>\n\n${note}${returnDecl(fn)} ${fn.name}(${params.join(", ") || "void"}) {\n    \n}\n`;
  },

  program(fn, code, nonce) {
    const returnType = parseType(fn.returns);
    const lines = [];
    const callArgs = [];
    fn.params.forEach((p, i) => {
      const type = parseType(p.type);
      if (type.depth === 0) {
        lines.push(`        ${SCALAR[type.base]} p${i} = ${READ[type.base]};`);
        callArgs.push(`p${i}`);
      } else {
        lines.push(`        int p${i}n = (int)ncc_read_long();`);
        lines.push(`        ${SCALAR[type.base]}* p${i} = (${SCALAR[type.base]}*)malloc(sizeof(${SCALAR[type.base]}) * (p${i}n > 0 ? p${i}n : 1));`);
        lines.push(`        for (int k = 0; k < p${i}n; k++) p${i}[k] = ${READ[type.base]};`);
        callArgs.push(`p${i}`, `p${i}n`);
      }
    });
    let callAndWrite;
    if (returnType.depth === 0) {
      callAndWrite = `        ${SCALAR[returnType.base]} out = ${fn.name}(${callArgs.join(", ")});
        printf("${nonce} %lld OK ", t);
        ${WRITE[returnType.base]}(out);`;
    } else {
      callArgs.push("&outSize");
      callAndWrite = `        int outSize = -1;
        ${SCALAR[returnType.base]}* out = ${fn.name}(${callArgs.join(", ")});
        if (outSize < 0 || (out == NULL && outSize > 0)) {
            printf("${nonce} %lld ERR ", t);
            ncc_write_hex("returnSize was not set, or the returned array is NULL");
        } else {
            printf("${nonce} %lld OK %d", t, outSize);
            for (int k = 0; k < outSize; k++) { putchar(' '); ${WRITE[returnType.base]}(out[k]); }
        }`;
    }
    return `${code}

/* ---- test runner added by the site (your code is above) ---- */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>

static char* ncc_data = NULL;
static size_t ncc_len = 0, ncc_pos = 0;

static char* ncc_next(void) {
    while (ncc_pos < ncc_len && (unsigned char)ncc_data[ncc_pos] <= ' ') ncc_pos++;
    char* start = ncc_data + ncc_pos;
    while (ncc_pos < ncc_len && (unsigned char)ncc_data[ncc_pos] > ' ') ncc_pos++;
    if (ncc_pos < ncc_len) ncc_data[ncc_pos++] = '\\0';
    return start;
}
static long long ncc_read_long(void) { return strtoll(ncc_next(), NULL, 10); }
static double ncc_read_double(void) { return strtod(ncc_next(), NULL); }
static char* ncc_read_string(void) {
    char* t = ncc_next();
    size_t n = strlen(t);
    if (n == 1 && t[0] == '-') n = 0;
    char* s = (char*)malloc(n / 2 + 1);
    for (size_t i = 0; i + 1 < n; i += 2) {
        char pair[3] = { t[i], t[i + 1], '\\0' };
        s[i / 2] = (char)strtol(pair, NULL, 16);
    }
    s[n / 2] = '\\0';
    return s;
}
static void ncc_write_hex(const char* s) {
    if (s == NULL || *s == '\\0') { putchar('-'); return; }
    for (const unsigned char* p = (const unsigned char*)s; *p; p++) printf("%02x", *p);
}
static void ncc_write_long(long long v) { printf("%lld", v); }
static void ncc_write_double(double v) { printf("%.17g", v); }
static void ncc_write_bool(bool v) { putchar(v ? '1' : '0'); }
static void ncc_write_string(const char* v) {
    if (v == NULL) { fputs("<null>", stdout); return; }
    ncc_write_hex(v);
}

int main(void) {
    size_t cap = 1 << 16;
    ncc_data = (char*)malloc(cap + 1);
    size_t got;
    while ((got = fread(ncc_data + ncc_len, 1, cap - ncc_len, stdin)) > 0) {
        ncc_len += got;
        if (ncc_len == cap) { cap *= 2; ncc_data = (char*)realloc(ncc_data, cap + 1); }
    }
    ncc_data[ncc_len] = '\\0';
    long long count = ncc_read_long();
    for (long long t = 0; t < count; t++) {
${lines.join("\n")}
${callAndWrite}
        putchar('\\n');
        fflush(stdout);
    }
    return 0;
}
`;
  },
};
