import { ObjectId } from "mongodb";
import { withDb } from "@/lib/mongodb";
import { pointsFor, PRIORITY_MULTIPLIER } from "@/lib/judge/languageList.mjs";

// Points are earned once per challenge per language: the first passing
// Submit in Python earns the Python points, a later pass in Java earns the
// Java points, and re-submitting in Python again earns nothing.
//
// Each award is recorded in the `solves` collection, which has a unique
// index on (userId, challengeId, languageId); see scripts/setup-db.mjs.
// That index is what stops double-awarding, even if someone double-clicks
// Submit. users.points is a running total of solves; if it ever drifts,
// `npm run points:recalc` rebuilds it from the solves.
//
// Server-only.

const DUPLICATE_KEY = 11000;

export async function awardSolve({ userId, challenge, languageId }) {
  const userObjectId = new ObjectId(userId);
  const key = { userId: userObjectId, challengeId: challenge.id, languageId };

  return withDb(async (db) => {
    const solves = db.collection("solves");
    const users = db.collection("users");

    // 1. Record the solve. A duplicate means it was solved before.
    try {
      await solves.insertOne({
        ...key,
        points: pointsFor(challenge.points, languageId),
        awarded: false,
        solvedAt: new Date(),
      });
    } catch (error) {
      if (error.code !== DUPLICATE_KEY) throw error;
    }

    // 2. Claim the award. Only one request can flip awarded false -> true,
    //    so points are added exactly once, and a solve whose points failed
    //    to save last time gets them on the next successful Submit.
    const claimed = await solves.findOneAndUpdate(
      { ...key, awarded: false },
      { $set: { awarded: true } },
      { returnDocument: "after" }
    );
    if (!claimed) {
      const user = await users.findOne({ _id: userObjectId });
      return { awarded: 0, alreadySolved: true, total: user?.points ?? null };
    }

    // 3. Add the points. If that fails, release the claim so a retry works.
    try {
      const user = await users.findOneAndUpdate(
        { _id: userObjectId },
        { $inc: { points: claimed.points } },
        { returnDocument: "after" }
      );
      return { awarded: claimed.points, alreadySolved: false, total: user?.points ?? null };
    } catch (error) {
      await solves.updateOne(key, { $set: { awarded: false } }).catch(() => {});
      throw error;
    }
  });
}

// Which languages (Judge0 ids) a user has solved each challenge in.
// Returns a Map: challengeId -> [languageId, ...]
export async function getSolvedLanguages(userId, challengeIds = null) {
  const filter = { userId: new ObjectId(userId) };
  if (challengeIds) filter.challengeId = { $in: challengeIds };
  const solves = await withDb((db) =>
    db.collection("solves").find(filter, { projection: { _id: 0, challengeId: 1, languageId: 1 } }).toArray()
  );
  const byChallenge = new Map();
  for (const solve of solves) {
    if (!byChallenge.has(solve.challengeId)) byChallenge.set(solve.challengeId, []);
    byChallenge.get(solve.challengeId).push(solve.languageId);
  }
  return byChallenge;
}

export { PRIORITY_MULTIPLIER };
