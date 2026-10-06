// Rebuilds every user's point total from their solves (the record of what
// they've earned). Run it if a total ever looks wrong:
//
//   npm run points:recalc            (shows what would change)
//   npm run points:recalc -- --fix   (saves the corrected totals)

import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set. Add it to .env.local first (see README).");
  process.exit(1);
}

const fix = process.argv.includes("--fix");
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });

try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "coding-club");

  const earned = new Map();
  for await (const solve of db.collection("solves").find({}, { projection: { userId: 1, points: 1 } })) {
    const key = String(solve.userId);
    earned.set(key, (earned.get(key) || 0) + (Number(solve.points) || 0));
  }

  let wrong = 0;
  for await (const user of db.collection("users").find({}, { projection: { name: 1, email: 1, points: 1 } })) {
    const correct = earned.get(String(user._id)) || 0;
    if ((user.points || 0) === correct) continue;
    wrong += 1;
    console.log(`${user.name} <${user.email}>: has ${user.points || 0}, should have ${correct}`);
    if (fix) await db.collection("users").updateOne({ _id: user._id }, { $set: { points: correct } });
  }

  if (!wrong) console.log("Every user's points match their solves.");
  else console.log(fix ? `Fixed ${wrong} user(s).` : `${wrong} user(s) are off. Run with -- --fix to correct them.`);
} catch (error) {
  console.error("Recalc failed:", error.message);
  process.exitCode = 1;
} finally {
  await client.close();
}
