// Rebuilds every user's point total from their records: solves (points per
// challenge per language) plus achievements (e.g. "Learned Rust" for a
// member's first solve in a language). Run it if a total ever looks wrong:
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
// the "Learned <language>" achievement for every language they've solved
// something in (if they don't have it yet).

import { MongoClient } from "mongodb";
import { pointsFor } from "../lib/judge/languageList.mjs";
import { getAchievement, learnedLanguageKey } from "../lib/achievements.mjs";

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
  const achievements = db.collection("achievements");

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
      const learned = getAchievement(learnedLanguageKey(solve.languageId));
      if (!learned) continue;
      const exists = await achievements.countDocuments({ userId: solve.userId, key: learned.key }, { limit: 1 });
      if (exists) continue;
      added += 1;
      if (fix) {
        await achievements.insertOne({
          userId: solve.userId,
          key: learned.key,
          points: learned.points,
          challengeId: solve.challengeId,
          languageId: solve.languageId,
          unlockedAt: solve.solvedAt || new Date(),
        });
      }
    }
    console.log(`${fix ? "Re-priced" : "Would re-price"} ${repriced} solve(s) and ${fix ? "unlocked" : "would unlock"} ${added} "Learned <language>" achievement(s).`);
  }

  const earned = new Map();
  const add = (userId, points) => {
    const key = String(userId);
    earned.set(key, (earned.get(key) || 0) + (Number(points) || 0));
  };
  for await (const solve of solves.find({}, { projection: { userId: 1, points: 1 } })) add(solve.userId, solve.points);
  for await (const achievement of achievements.find({}, { projection: { userId: 1, points: 1 } })) add(achievement.userId, achievement.points);

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
