// Language-by-language walkthroughs for the club fair challenge (/fair),
// which asks for greet(name) -> "Hello, <name>!". The fair page shows the
// guide for whichever language the visitor picks in the editor.
//
// Text fields understand `code` and **bold** (components/InlineText.js).
// `answer` is the line(s) that go inside the function. The full "give up"
// answer is built from the challenge's real starter code (buildAnswer), so
// it stays correct if the starter code ever changes.
//
// If you change the fair challenge itself, update these to match.

export const FAIR_GUIDES = {
  71: {
    name: "Python",
    tag: "Easiest to start",
    meet: [
      "`def greet(name: str) -> str:` creates a **function** called `greet`. `name: str` means it receives some text (a **string**), and `-> str` means it gives text back.",
      "Ignore the `from typing import List` line at the top. This challenge doesn't need it.",
    ],
    where: "Delete the word `pass` (it's a placeholder that means \"do nothing yet\") and type this line in its place:",
    answer: ['return "Hello, " + name + "!"'],
    notes: [
      "Keep the 4 spaces in front of the line. Python uses that indentation to know the line belongs inside the function.",
      "`+` glues pieces of text together. Mind the space after the comma inside the quotes.",
    ],
  },
  62: {
    name: "Java",
    tag: "Taught at Neumont",
    meet: [
      "Java keeps everything inside a **class**, so the function (Java calls it a **method**) lives inside `class Solution`.",
      "`public String greet(String name)` means it receives a `String` (text) called `name` and gives a `String` back. You can ignore `import java.util.*;` for now.",
    ],
    where: "Click on the empty line between the `{` and `}` under `greet` and type:",
    answer: ['return "Hello, " + name + "!";'],
    notes: [
      "Every statement in Java ends with a semicolon `;`. Forgetting it is the most common first error.",
      "`String` starts with a capital S in Java, and capitals matter everywhere.",
    ],
  },
  51: {
    name: "C#",
    tag: "Taught at Neumont",
    meet: [
      "The function (C# calls it a **method**) lives inside `public class Solution`. `public string greet(string name)` receives text called `name` and gives text back.",
      "The `using` lines at the top load built-in tools. You won't need them here.",
    ],
    where: "Click on the empty line between the `{` and `}` under `greet` and type:",
    answer: ['return "Hello, " + name + "!";'],
    notes: [
      "Every statement in C# ends with a semicolon `;`.",
      "Fancy alternative: `return $\"Hello, {name}!\";`. The `$` lets you drop variables right into the text inside `{ }`.",
    ],
  },
  54: {
    name: "C++",
    tag: "",
    meet: [
      "`#include <bits/stdc++.h>` loads the standard library, and `using namespace std;` lets you write `string` instead of `std::string`.",
      "`string greet(string& name)` receives a string and returns one. The `&` means it borrows `name` instead of copying it.",
    ],
    where: "Click on the empty line between the `{` and `}` and type:",
    answer: ['return "Hello, " + name + "!";'],
    notes: [
      "Every statement in C++ ends with a semicolon `;`.",
      "This works because `name` is a `string`, so `+` can join it to the text in quotes.",
    ],
  },
  63: {
    name: "JavaScript",
    tag: "",
    meet: [
      "The `/** ... */` block above the function is a comment. It notes that `name` is a string and that the function returns a string.",
      "JavaScript doesn't make you write types, so the function itself is just `function greet(name)`.",
    ],
    where: "Click on the empty line between the `{` and `}` and type:",
    answer: ['return "Hello, " + name + "!";'],
    notes: [
      "The `;` at the end is optional in JavaScript, but it's a good habit.",
      "Fancy alternative: a template literal, written with backticks, lets you drop `${name}` right into the text.",
    ],
  },
  74: {
    name: "TypeScript",
    tag: "",
    meet: [
      "TypeScript is JavaScript with types. `name: string` says the input is text, and the `: string` after the `)` says the function returns text.",
    ],
    where: "Click on the empty line between the `{` and `}` and type:",
    answer: ['return "Hello, " + name + "!";'],
    notes: [
      "The `;` at the end is optional, but it's a good habit.",
      "If you return something that isn't text, TypeScript catches the mistake before the code even runs. That's the point of types.",
    ],
  },
  60: {
    name: "Go",
    tag: "",
    meet: [
      "`package main` has to be at the top of every Go program.",
      "`func greet(name string) string` takes a string called `name` and returns a string. In Go, the type comes **after** the name.",
    ],
    where: "Click on the empty line between the `{` and `}` and type:",
    answer: ['return "Hello, " + name + "!"'],
    notes: ["No semicolon needed. Go adds them for you behind the scenes."],
  },
  73: {
    name: "Rust",
    tag: "",
    meet: [
      "`fn greet(name: String) -> String` takes a `String` and returns one.",
      "In Rust, the last line of a function **without** a `;` is what the function gives back.",
    ],
    where: "Click on the empty line between the `{` and `}` and type:",
    answer: ['format!("Hello, {}!", name)'],
    notes: [
      "`format!` builds text and fills each `{}` with the next value you give it.",
      "Don't put a `;` after it, or the function gives back nothing. (Writing `return format!(\"Hello, {}!\", name);` with the `;` works too.)",
    ],
  },
  50: {
    name: "C",
    tag: "Tricky",
    meet: [
      "C has no built-in text type. Text is a `char*`, a pointer to a row of characters, so you have to make room for the new text yourself.",
      "New to coding? Python or JavaScript will be much friendlier for a first try. Switch any time with the language picker.",
    ],
    where: "Click on the empty line between the `{` and `}` and type these three lines:",
    answer: [
      "char* result = malloc(strlen(name) + 9);",
      'sprintf(result, "Hello, %s!", name);',
      "return result;",
    ],
    notes: [
      "`malloc` reserves memory: the name's length plus 9 more characters (7 for `Hello, `, 1 for `!`, and 1 for the invisible end-of-text marker C needs).",
      "`sprintf` writes formatted text into `result`, putting `name` where `%s` is.",
    ],
  },
};

// Builds the complete answer for a language by putting the guide's answer
// lines into the starter code: in place of `pass` (Python) or the empty line
// inside the function body (everything else).
export function buildAnswer(starter, guide) {
  if (!starter || !guide) return "";
  const lines = starter.replace(/\r\n/g, "\n").split("\n");
  const signature = lines.findIndex((line) => /\bgreet\s*\(/.test(line));
  let slot = -1;
  for (let i = signature + 1; i < lines.length; i++) {
    if (/^\s*(pass)?\s*$/.test(lines[i])) {
      slot = i;
      break;
    }
  }
  if (signature < 0 || slot < 0) return starter;
  let indent = (lines[slot].match(/^\s*/) || [""])[0];
  if (!indent) indent = ((lines[signature].match(/^\s*/) || [""])[0]) + "    ";
  lines.splice(slot, 1, ...guide.answer.map((line) => indent + line));
  return lines.join("\n");
}

const SEMICOLON_LANGUAGES = [62, 51, 54, 50]; // a missing ; is a compile error
const PRINT_RE = /\b(print\s*\(|console\.(log|write)|System\.out|Console\.Write|cout\b|printf\s*\(|println!|fmt\.Print)/i;

// A friendly, best-guess nudge based on what the visitor has typed so far.
// Returns { kind: "start" | "tip" | "good", text } or null.
export function coachTip(code, languageId, starter) {
  const normalized = (code || "").replace(/\r\n/g, "\n");
  if (!normalized.trim() || normalized.trim() === (starter || "").replace(/\r\n/g, "\n").trim()) {
    return { kind: "start", text: "Your turn! Type the line from step 2 into the editor." };
  }
  if (languageId === 71 && /^\s*pass\s*$/m.test(normalized)) {
    return { kind: "tip", text: "Delete the word `pass`. It's only a placeholder." };
  }
  if (PRINT_RE.test(normalized) && !/\breturn\b|format!/.test(normalized)) {
    return {
      kind: "tip",
      text: "Printing shows text on the screen, but this function has to **give the text back**. Use `return` instead.",
    };
  }
  if (languageId === 71 && /^return\b/m.test(normalized)) {
    return { kind: "tip", text: "Put 4 spaces before `return` so Python knows it belongs inside the function." };
  }
  if (/hello/.test(normalized) && !/Hello/.test(normalized)) {
    return { kind: "tip", text: "Capital H! The tests expect `Hello` exactly." };
  }
  if (/Hello,(?! )/.test(normalized)) {
    return { kind: "tip", text: "Add a space after the comma inside the quotes: `\"Hello, \"`." };
  }
  if (/Hello/.test(normalized) && !/!/.test(normalized.replace(/!=/g, ""))) {
    return { kind: "tip", text: "Don't forget the `!` at the end." };
  }
  if (SEMICOLON_LANGUAGES.includes(languageId)) {
    const missing = normalized.split("\n").some((line) => /\breturn\b/.test(line) && !/;\s*(\/\/.*)?$/.test(line));
    if (missing) {
      return { kind: "tip", text: "End your `return` line with a semicolon `;`." };
    }
  }
  if (languageId === 73 && /format!\(.*\)\s*;\s*$/m.test(normalized) && !/\breturn\b/.test(normalized)) {
    return { kind: "tip", text: "Remove the `;` after `format!(...)`, or put `return` in front of it." };
  }
  const helloLines = normalized.split("\n").filter((line) => /Hello, /.test(line));
  if (helloLines.length && helloLines.some((line) => /\bname\b/.test(line))) {
    return { kind: "good", text: "Looks good! Press **Run Code** to test it." };
  }
  return null;
}
