// Python 3.8 (Judge0 language 71).
import { parseType, elementType } from "../types.mjs";

function hint(type) {
  if (type.depth > 0) return `List[${hint(elementType(type))}]`;
  return { int: "int", long: "int", double: "float", bool: "bool", string: "str" }[type.base];
}

function reader(type) {
  if (type.depth > 0) return `_h_rl(lambda: ${reader(elementType(type))})`;
  return { int: "_h_ri()", long: "_h_ri()", double: "_h_rd()", bool: "_h_rb()", string: "_h_rs()" }[type.base];
}

function writer(type, value) {
  if (type.depth > 0) return `_h_wl(lambda _x${type.depth}: ${writer(elementType(type), `_x${type.depth}`)}, ${value})`;
  return { int: "_h_wi", long: "_h_wi", double: "_h_wd", bool: "_h_wb", string: "_h_ws" }[type.base] + `(${value})`;
}

export const python = {
  supports: () => true,

  starter(fn) {
    const params = fn.params.map((p) => `${p.name}: ${hint(parseType(p.type))}`).join(", ");
    return `from typing import List\n\n\ndef ${fn.name}(${params}) -> ${hint(parseType(fn.returns))}:\n    pass\n`;
  },

  program(fn, code, nonce) {
    const args = fn.params.map((p) => reader(parseType(p.type))).join(", ");
    return `${code}


# ---- test runner added by the site (your code is above) ----
def _h_main():
    import sys as _h_sys
    _h_tokens = _h_sys.stdin.read().split()
    _h_pos = [0]

    def _h_next():
        _h_pos[0] += 1
        return _h_tokens[_h_pos[0] - 1]

    def _h_ri():
        return int(_h_next())

    def _h_rd():
        return float(_h_next())

    def _h_rb():
        return _h_next() == "1"

    def _h_rs():
        t = _h_next()
        return "" if t == "-" else bytes.fromhex(t).decode("utf-8")

    def _h_rl(item):
        n = int(_h_next())
        return [item() for _ in range(n)]

    def _h_type(v):
        return type(v).__name__

    def _h_wi(v):
        if isinstance(v, bool) or not isinstance(v, int):
            raise TypeError("returned " + _h_type(v) + ", expected int")
        return str(v)

    def _h_wd(v):
        if isinstance(v, bool) or not isinstance(v, (int, float)):
            raise TypeError("returned " + _h_type(v) + ", expected float")
        return repr(float(v))

    def _h_wb(v):
        if not isinstance(v, bool):
            raise TypeError("returned " + _h_type(v) + ", expected bool")
        return "1" if v else "0"

    def _h_ws(v):
        if not isinstance(v, str):
            raise TypeError("returned " + _h_type(v) + ", expected str")
        return v.encode("utf-8").hex() or "-"

    def _h_wl(item, v):
        if not isinstance(v, (list, tuple)):
            raise TypeError("returned " + _h_type(v) + ", expected list")
        return " ".join([str(len(v))] + [item(x) for x in v])

    _h_globals = globals()
    _h_count = _h_ri()
    for _h_i in range(_h_count):
        _h_args = [${args}]
        try:
            # Accept a plain function, or LeetCode-style "class Solution:".
            _h_fn = _h_globals.get("${fn.name}")
            if _h_fn is None and hasattr(_h_globals.get("Solution"), "${fn.name}"):
                _h_fn = getattr(_h_globals["Solution"](), "${fn.name}")
            if not callable(_h_fn):
                raise NameError("couldn't find a function named ${fn.name} (check the spelling)")
            _h_out = _h_fn(*_h_args)
            _h_line = "${nonce} " + str(_h_i) + " OK " + ${writer(parseType(fn.returns), "_h_out")}
        except BaseException as _h_e:
            _h_msg = (type(_h_e).__name__ + ": " + str(_h_e))[:500]
            _h_line = "${nonce} " + str(_h_i) + " ERR " + (_h_msg.encode("utf-8").hex() or "-")
        print(_h_line, flush=True)


_h_main()
`;
  },
};
