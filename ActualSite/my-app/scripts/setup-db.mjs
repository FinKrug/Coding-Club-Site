// One-time (safe to re-run) database setup: checks the MONGODB_URI
// connection works, creates the indexes the site relies on, and turns on
// validation rules for challenges.
//
//   npm run db:setup
//
// Reads MONGODB_URI / MONGODB_DB from .env.local.

import { MongoClient } from "mongodb";
import { learnedLanguageKey } from "../lib/achievements.mjs";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set. Add it to .env.local first (see README).");
  process.exit(1);
}

// Rules every challenge document must follow. Atlas checks these whenever a
// challenge is inserted or edited and refuses documents that break them, so
// a typo in a pasted challenge gets caught right away instead of breaking
// the page. Extra fields (like test cases) are allowed.
const NUMBER = ["int", "long", "double"];
const challengeValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: ["id", "title", "difficulty", "description"],
    properties: {
      id: {
        bsonType: NUMBER,
        minimum: 1,
        multipleOf: 1,
        description: "a whole number, 1 or more. It's the number in the page URL (/problems/<id>), and each challenge needs a different one.",
      },
      title: { bsonType: "string", minLength: 1, description: "the challenge name (text)" },
      difficulty: {
        enum: ["Easy", "Medium", "Hard"],
        description: "exactly one of: Easy, Medium, Hard",
      },
      description: { bsonType: "string", description: "the problem statement (text)" },
      week: { bsonType: "string", description: 'text such as "Week 3"' },
      points: { bsonType: NUMBER, minimum: 0, description: "base points, 0 or more" },
      published: { bsonType: "bool", description: "true or false (no quotes)" },
      timeLimitSeconds: {
        bsonType: NUMBER,
        minimum: 1,
        maximum: 10,
        description: "seconds the whole test run may take, 1 to 10 (default 2)",
      },
      function: {
        bsonType: "object",
        required: ["name", "params", "returns"],
        description: 'describes the function members write, e.g. { "name": "sum", "params": [{ "name": "a", "type": "int" }], "returns": "int" }',
        properties: {
          name: { bsonType: "string", description: "the function name" },
          params: {
            bsonType: "array",
            description: 'a list like [{ "name": "a", "type": "int" }] (use [] for none)',
            items: {
              bsonType: "object",
              required: ["name", "type"],
              properties: {
                name: { bsonType: "string" },
                type: { bsonType: "string", description: "int, long, double, bool, string, optionally with [] or [][]" },
              },
            },
          },
          returns: { bsonType: "string", description: "int, long, double, bool, string, optionally with [] or [][]" },
          anyOrder: { bsonType: "bool", description: "true or false (no quotes)" },
        },
      },
      tests: {
        bsonType: "array",
        description: 'a list like [{ "args": [2, 3], "expected": 5 }]',
        items: {
          bsonType: "object",
          required: ["args", "expected"],
          properties: {
            args: { bsonType: "array", description: "one value per parameter, in order" },
            hidden: { bsonType: "bool", description: "true or false (no quotes)" },
          },
        },
      },
      examples: {
        bsonType: "array",
        description: 'a list like [{ "input": "(2, 3)", "output": "5" }]',
        items: {
          bsonType: "object",
          required: ["input", "output"],
          properties: {
            input: { bsonType: "string", description: "text, so wrap it in quotes" },
            output: { bsonType: "string", description: "text, so wrap it in quotes" },
          },
        },
      },
    },
  },
};

async function ensureCollectionWithValidator(db, name, validator) {
  const exists = (await db.listCollections({ name }).toArray()).length > 0;
  if (exists) {
    await db.command({ collMod: name, validator, validationLevel: "strict" });
  } else {
    await db.createCollection(name, { validator, validationLevel: "strict" });
  }
}

const dbName = process.env.MONGODB_DB || "coding-club";
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });

try {
  await client.connect();
  const db = client.db(dbName);
  await db.command({ ping: 1 });
  console.log(`Connected to MongoDB (database "${dbName}").`);

  // One account per email address and per Google user. "partial" means
  // the rule only applies to accounts that have that field (email-only
  // accounts have no googleId). Older versions of this script made
  // non-unique / non-partial versions of these indexes, so replace those.
  const users = db.collection("users");
  for (const index of await users.indexes()) {
    if ((index.name === "googleId_1" || index.name === "email_1") && !index.partialFilterExpression) {
      await users.dropIndex(index.name);
    }
  }
  await users.createIndex({ googleId: 1 }, { unique: true, partialFilterExpression: { googleId: { $type: "string" } } });
  await users.createIndex({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: "string" } } });

  // Emailed sign-up / password-reset codes: one per email + purpose, and
  // MongoDB deletes each one automatically once it expires.
  const codes = db.collection("authCodes");
  await codes.createIndex({ email: 1, purpose: 1 }, { unique: true });
  await codes.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

  try {
    await ensureCollectionWithValidator(db, "challenges", challengeValidator);
    console.log("Challenge validation rules are on.");
  } catch (error) {
    console.warn(`Couldn't turn on challenge validation (${error.message}). The site still works without it.`);
  }
  // No two challenges can share an id (it's their URL).
  await db.collection("challenges").createIndex({ id: 1 }, { unique: true });

  // Points are earned once per challenge per language. This unique index is
  // what guarantees it (see lib/points.js).
  await db.collection("solves").createIndex({ userId: 1, challengeId: 1, languageId: 1 }, { unique: true });
  // Speeds up the "Solved by N members / first to solve" list on challenge pages.
  await db.collection("solves").createIndex({ challengeId: 1, solvedAt: 1 });
  // Each achievement (e.g. "Learned Rust") is unlocked once per member.
  const achievements = db.collection("achievements");
  await achievements.createIndex({ userId: 1, key: 1 }, { unique: true });

  // Older versions stored the first-solve-in-a-language reward in a
  // "languageBonuses" collection. Move any of those over to achievements
  // (same points, so totals don't change). Safe to re-run. Once the new
  // version is deployed you can delete "languageBonuses" in Atlas.
  const oldBonuses = await db.listCollections({ name: "languageBonuses" }).toArray();
  if (oldBonuses.length) {
    let moved = 0;
    for await (const bonus of db.collection("languageBonuses").find({})) {
      const key = learnedLanguageKey(bonus.languageId);
      if (!key) continue;
      const result = await achievements.updateOne(
        { userId: bonus.userId, key },
        {
          $setOnInsert: {
            points: bonus.points,
            challengeId: bonus.challengeId,
            languageId: bonus.languageId,
            unlockedAt: bonus.awardedAt || new Date(),
          },
        },
        { upsert: true }
      );
      if (result.upsertedCount) moved += 1;
    }
    console.log(`Moved ${moved} new-language bonus(es) over to "Learned <language>" achievements.`);
  }

  console.log("Indexes are in place. You're good to go.");
} catch (error) {
  console.error("Database setup failed:", error.message);
  process.exitCode = 1;
} finally {
  await client.close();
}
