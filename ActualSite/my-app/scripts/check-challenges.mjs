// Checks every challenge in the database (published or not) for mistakes in
// its `function` description or `tests`, the things Atlas's validation
// rules can't catch, like a test with the wrong number of args or an
// "expected" of the wrong type.
//
//   npm run db:check
//
// The site shows the same problems on a broken challenge's page, but this
// checks them all at once.

import { MongoClient } from "mongodb";
import { validateSpec, LANGUAGES, supportsLanguage } from "../lib/judge/index.mjs";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set. Add it to .env.local first (see README).");
  process.exit(1);
}

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });

try {
  await client.connect();
  const challenges = await client
    .db(process.env.MONGODB_DB || "coding-club")
    .collection("challenges")
    .find({}, { projection: { _id: 0, id: 1, title: 1, published: 1, function: 1, tests: 1 } })
    .sort({ id: 1 })
    .toArray();

  let broken = 0;
  for (const challenge of challenges) {
    const label = `#${challenge.id} ${challenge.title}${challenge.published === false ? " (unpublished)" : ""}`;
    if (!challenge.function) {
      console.log(`-  ${label}: no tests yet (Run Code just runs the program).`);
      continue;
    }
    const problems = validateSpec(challenge.function, challenge.tests);
    if (problems.length) {
      broken += 1;
      console.log(`✗  ${label}:`);
      for (const problem of problems) console.log(`     - ${problem}`);
      continue;
    }
    const hidden = challenge.tests.filter((t) => t.hidden).length;
    const missing = LANGUAGES.filter((l) => !supportsLanguage(challenge.function, l.id)).map((l) => l.name);
    console.log(
      `✓  ${label}: ${challenge.tests.length - hidden} example + ${hidden} hidden tests` +
        (missing.length ? ` (not available in ${missing.join(", ")})` : "")
    );
  }
  console.log(broken ? `\n${broken} challenge(s) need fixing.` : "\nAll challenges look good.");
  if (broken) process.exitCode = 1;
} catch (error) {
  console.error("Check failed:", error.message);
  process.exitCode = 1;
} finally {
  await client.close();
}
