// Copies the starter challenges in data/challenges.json into MongoDB.
//
//   npm run db:seed
//
// Only adds challenges whose `id` isn't in the database yet, so edits
// you've made in Atlas are safe. To overwrite the database copies of the
// challenges in this file with the file's version, run:
//
//   npm run db:seed -- --update
//
// Run `npm run db:setup` first.

import { readFileSync } from "node:fs";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set. Add it to .env.local first (see README).");
  process.exit(1);
}

const challenges = JSON.parse(
  readFileSync(new URL("../data/challenges.json", import.meta.url), "utf8")
);

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });

try {
  await client.connect();
  const collection = client
    .db(process.env.MONGODB_DB || "coding-club")
    .collection("challenges");

  const update = process.argv.includes("--update");
  let changed = 0;
  for (const challenge of challenges) {
    if (update) {
      await collection.replaceOne({ id: challenge.id }, challenge, { upsert: true });
      changed += 1;
      console.log(`  ~ #${challenge.id} ${challenge.title}`);
      continue;
    }
    const result = await collection.updateOne(
      { id: challenge.id },
      { $setOnInsert: challenge },
      { upsert: true }
    );
    if (result.upsertedCount) {
      changed += 1;
      console.log(`  + #${challenge.id} ${challenge.title}`);
    }
  }

  if (update) console.log(`Updated ${changed} challenge(s) from data/challenges.json.`);
  else if (changed) console.log(`Added ${changed} challenge(s).`);
  else console.log("Nothing to add: every challenge in data/challenges.json is already in the database. (Use -- --update to overwrite them.)");
} catch (error) {
  console.error("Seeding failed:", error.message);
  if (error.errInfo) console.error(JSON.stringify(error.errInfo, null, 2));
  process.exitCode = 1;
} finally {
  await client.close();
}
