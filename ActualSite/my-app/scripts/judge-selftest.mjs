// Checks that the test runners in lib/judge/ work on the real Judge0
// server: runs a correct solution to each sample challenge in every
// language (see scripts/harness-samples.mjs) and expects all tests to pass.
//
//   npm run judge:selftest           (all languages)
//   npm run judge:selftest -- java   (one language, by key: python, java, csharp, ...)
//
// Run it after changing anything in lib/judge/, or if a language suddenly
// stops working on the site. Reads JUDGE0_URL / JUDGE0_AUTH_TOKEN from .env.local.

import { SAMPLES } from "./harness-samples.mjs";
import { LANGUAGES, supportsLanguage } from "../lib/judge/index.mjs";
import { grade } from "../lib/judge/grade.mjs";
import { submitToJudge0 } from "../lib/judge/judge0Api.mjs";

const only = process.argv[2];
const execute = (job) =>
  submitToJudge0({ url: process.env.JUDGE0_URL, token: process.env.JUDGE0_AUTH_TOKEN, memoryLimitKb: 256000, ...job });

let failures = 0;
for (const language of LANGUAGES) {
  if (only && language.key !== only) continue;
  for (const sample of SAMPLES) {
    if (!supportsLanguage(sample.function, language.id)) continue;
    let line;
    try {
      const result = await grade({
        fn: sample.function,
        tests: sample.tests,
        languageId: language.id,
        code: sample.solutions[language.key],
        mode: "submit",
        execute,
      });
      if (result.status === "passed") {
        line = `PASS  ${language.name.padEnd(11)} ${sample.title}`;
      } else {
        failures += 1;
        const detail =
          result.status === "compile-error"
            ? result.compileOutput
            : result.tests.filter((t) => t.status !== "passed").map((t) => `test ${t.number}: ${t.status} ${t.message || ""}`).join("\n");
        line = `FAIL  ${language.name.padEnd(11)} ${sample.title}\n${detail}`;
      }
    } catch (error) {
      failures += 1;
      line = `FAIL  ${language.name.padEnd(11)} ${sample.title}\n${error.message}${error.details ? "\n" + error.details : ""}`;
    }
    console.log(line);
  }
}
console.log(failures ? `\n${failures} check(s) failed.` : "\nEverything passed. The test runners work on this Judge0 server.");
if (failures) process.exitCode = 1;
