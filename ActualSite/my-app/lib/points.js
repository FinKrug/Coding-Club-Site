import { ObjectId } from "mongodb";
import { withDb } from "@/lib/mongodb";
import { pointsFor, NEW_LANGUAGE_BONUS } from "@/lib/judge/languageList.mjs";

// Points are earned once per challenge per language: the first passing
// Submit in Rust earns the Rust points, a later pass in Java earns the Java
// points, and re-submitting in Rust again earns nothing. How much each
// language is worth lives in lib/judge/languageList.mjs.
//
// On top of that, the first time a member solves anything in a language
// they've never used here, they get a one-time NEW_LANGUAGE_BONUS.
//
// Records:
//   solves          one per (user, challenge, language), unique index
//   languageBonuses one per (user, language), unique index
// Both have unique indexes (scripts/setup-db.mjs), which is what stops
// double-awarding even if someone double-clicks Submit. users.points is a
// running total of both; `npm run points:recalc` rebuilds it if it drifts.
//
// Server-only.

const DUPLICATE_KEY = 11000;

export async function awardSolve({ userId, challenge, languageId }) {
  const userObjectId = new ObjectId(userId);
  const key = { userId: userObjectId, challengeId: challenge.id, languageId };

  return withDb(async (db) => {
    const solves = db.collection("solves");
    const bonuses = db.collection("languageBonuses");
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
      return { awarded: 0, bonus: 0, alreadySolved: true, total: user?.points ?? null };
    }

    // 3. First time in this language? Only if this is the member's earliest
    //    solve in it (so two submissions at once can't both miss out), and
    //    the unique index lets just one request record the bonus.
    let bonus = 0;
    const usedBefore = await solves.countDocuments(
      {
        userId: userObjectId,
        languageId,
        challengeId: { $ne: challenge.id },
        $or: [
          { solvedAt: { $lt: claimed.solvedAt } },
          { solvedAt: claimed.solvedAt, _id: { $lt: claimed._id } },
        ],
      },
      { limit: 1 }
    );
    if (!usedBefore && NEW_LANGUAGE_BONUS > 0) {
      try {
        await bonuses.insertOne({
          userId: userObjectId,
          languageId,
          challengeId: challenge.id,
          points: NEW_LANGUAGE_BONUS,
          awardedAt: new Date(),
        });
        bonus = NEW_LANGUAGE_BONUS;
      } catch (error) {
        if (error.code !== DUPLICATE_KEY) throw error;
      }
    }

    // 4. Add the points. If that fails, undo the claim and bonus so a retry works.
    try {
      const user = await users.findOneAndUpdate(
        { _id: userObjectId },
        { $inc: { points: claimed.points + bonus } },
        { returnDocument: "after" }
      );
      return { awarded: claimed.points, bonus, alreadySolved: false, total: user?.points ?? null };
    } catch (error) {
      await solves.updateOne(key, { $set: { awarded: false } }).catch(() => {});
      if (bonus) await bonuses.deleteOne({ userId: userObjectId, languageId }).catch(() => {});
      throw error;
    }
  });
}

// All of a member's solves: which languages they've solved each challenge
// in, and which languages they've used at all.
// Returns { byChallenge: Map(challengeId -> [languageId]), languages: Set(languageId) }
export async function getSolveSummary(userId) {
  const solves = await withDb((db) =>
    db
      .collection("solves")
      .find({ userId: new ObjectId(userId) }, { projection: { _id: 0, challengeId: 1, languageId: 1 } })
      .toArray()
  );
  const byChallenge = new Map();
  const languages = new Set();
  for (const solve of solves) {
    if (!byChallenge.has(solve.challengeId)) byChallenge.set(solve.challengeId, []);
    byChallenge.get(solve.challengeId).push(solve.languageId);
    languages.add(solve.languageId);
  }
  return { byChallenge, languages };
}

// Which languages a user has solved each challenge in.
// Returns a Map: challengeId -> [languageId, ...]
export async function getSolvedLanguages(userId) {
  return (await getSolveSummary(userId)).byChallenge;
}
