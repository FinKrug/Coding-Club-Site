// Rebuilds every user's point total from their records: solves (points per
// challenge per language) plus languageBonuses (first solve in a new
// language). Run it if a total ever looks wrong:
//
//   npm run points:recalc                    shows what would change
//   npm run points:recalc -- --fix           saves the corrected totals
//
// After changing how much languages are worth (lib/judge/languageList.mjs),
// you can also re-price everything already earned under the new rules:
//
//   npm run points:recalc -- --reprice --fix
//
// --reprice sets each solve to what it's worth now, and gives each member
// the new-language bonus for their earliest solve in every language they've
// used (if they don't have it yet).

import { MongoClient } from "mongodb";
import { pointsFor, NEW_LANGUAGE_BONUS } from "../lib/judge/languageList.mjs";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set. Add it to .env.local first (see README).");
  process.exit(1);
}

const fix = process.argv.includes("--fix");
const reprice = process.argv.includes("--reprice");
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });

try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "coding-club");
  const solves = db.collection("solves");
  const bonuses = db.collection("languageBonuses");

  if (reprice) {
    const basePoints = new Map();
    for await (const challenge of db.collection("challenges").find({}, { projection: { id: 1, points: 1 } })) {
      basePoints.set(challenge.id, challenge.points);
    }
    let repriced = 0;
    const earliest = new Map(); // "user:language" -> earliest solve
    for await (const solve of solves.find({}).sort({ solvedAt: 1, _id: 1 })) {
      const worth = pointsFor(basePoints.get(solve.challengeId), solve.languageId);
      if (solve.points !== worth) {
        repriced += 1;
        if (fix) await solves.updateOne({ _id: solve._id }, { $set: { points: worth } });
      }
      const key = `${solve.userId}:${solve.languageId}`;
      if (!earliest.has(key)) earliest.set(key, solve);
    }
    let added = 0;
    for (const solve of earliest.values()) {
      const exists = await bonuses.countDocuments({ userId: solve.userId, languageId: solve.languageId }, { limit: 1 });
      if (exists) continue;
      added += 1;
      if (fix) {
        await bonuses.insertOne({
          userId: solve.userId,
          languageId: solve.languageId,
          challengeId: solve.challengeId,
          points: NEW_LANGUAGE_BONUS,
          awardedAt: solve.solvedAt || new Date(),
        });
      }
    }
    console.log(`${fix ? "Re-priced" : "Would re-price"} ${repriced} solve(s) and ${fix ? "added" : "would add"} ${added} new-language bonus(es).`);
  }

  const earned = new Map();
  const add = (userId, points) => {
    const key = String(userId);
    earned.set(key, (earned.get(key) || 0) + (Number(points) || 0));
  };
  for await (const solve of solves.find({}, { projection: { userId: 1, points: 1 } })) add(solve.userId, solve.points);
  for await (const bonus of bonuses.find({}, { projection: { userId: 1, points: 1 } })) add(bonus.userId, bonus.points);

  let wrong = 0;
  for await (const user of db.collection("users").find({}, { projection: { name: 1, email: 1, points: 1 } })) {
    const correct = earned.get(String(user._id)) || 0;
    if ((user.points || 0) === correct) continue;
    wrong += 1;
    console.log(`${user.name} <${user.email}>: has ${user.points || 0}, should have ${correct}`);
    if (fix) await db.collection("users").updateOne({ _id: user._id }, { $set: { points: correct } });
  }

  if (!wrong) console.log("Every user's points match their records.");
  else console.log(fix ? `Fixed ${wrong} user(s).` : `${wrong} user(s) are off. Run with -- --fix to correct them.`);
} catch (error) {
  console.error("Recalc failed:", error.message);
  process.exitCode = 1;
} finally {
  await client.close();
}
