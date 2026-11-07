import test from "node:test";
import assert from "node:assert/strict";
import {
  createCode,
  redeemCode,
  CodeCooldownError,
  CODE_ERRORS,
} from "../../lib/authCodes.js";

// Set SESSION_SECRET for hashCode HMAC
process.env.SESSION_SECRET = "super-secret-session-key-must-be-at-least-32-chars";

function createMockDb() {
  const store = new Map(); // key = email:purpose -> record
  return {
    collection(name) {
      if (name !== "authCodes") throw new Error("Unexpected collection");
      return {
        async findOne({ email, purpose }) {
          const item = store.get(`${email}:${purpose}`);
          return item ? { ...item } : null;
        },
        async replaceOne({ email, purpose }, doc, { upsert }) {
          const _id = doc._id || `id_${Date.now()}_${Math.random()}`;
          store.set(`${email}:${purpose}`, { ...doc, _id });
        },
        async updateOne({ _id }, { $inc }) {
          for (const [key, doc] of store.entries()) {
            if (doc._id === _id) {
              doc.attempts = (doc.attempts || 0) + ($inc.attempts || 0);
              break;
            }
          }
        },
        async deleteOne({ _id }) {
          for (const [key, doc] of store.entries()) {
            if (doc._id === _id) {
              store.delete(key);
              return { deletedCount: 1 };
            }
          }
          return { deletedCount: 0 };
        },
      };
    },
  };
}

test("authCodes.js - CODE_ERRORS mapping", () => {
  assert.ok(CODE_ERRORS.missing);
  assert.ok(CODE_ERRORS.expired);
  assert.ok(CODE_ERRORS.wrong);
  assert.ok(CODE_ERRORS["too-many"]);
});

test("authCodes.js - createCode and redeemCode successful flow", async () => {
  const db = createMockDb();
  const email = "member@example.com";
  const purpose = "signup";
  const data = { name: "Alice" };

  const code = await createCode(db, { email, purpose, data });
  assert.equal(typeof code, "string");
  assert.equal(code.length, 6);
  assert.match(code, /^\d{6}$/);

  // Redeem with correct code
  const result = await redeemCode(db, { email, purpose, code });
  assert.equal(result.ok, true);
  assert.deepEqual(result.data, { name: "Alice" });

  // Code can only be used once (now deleted)
  const reuseResult = await redeemCode(db, { email, purpose, code });
  assert.equal(reuseResult.ok, false);
  assert.equal(reuseResult.reason, "missing");
});

test("authCodes.js - redeemCode with wrong code increments attempts and fails", async () => {
  const db = createMockDb();
  const email = "bob@example.com";
  const purpose = "reset";

  const code = await createCode(db, { email, purpose });

  // 1st wrong attempt
  const wrong1 = await redeemCode(db, { email, purpose, code: "000000" });
  assert.equal(wrong1.ok, false);
  assert.equal(wrong1.reason, "wrong");

  // Subsequent wrong attempts up to lockout (5 attempts total)
  await redeemCode(db, { email, purpose, code: "000000" }); // 2
  await redeemCode(db, { email, purpose, code: "000000" }); // 3
  await redeemCode(db, { email, purpose, code: "000000" }); // 4
  const wrong5 = await redeemCode(db, { email, purpose, code: "000000" }); // 5
  assert.equal(wrong5.ok, false);
  assert.equal(wrong5.reason, "too-many");
});

test("authCodes.js - createCode enforces resend cooldown", async () => {
  const db = createMockDb();
  const email = "cooldown@example.com";
  const purpose = "signup";

  await createCode(db, { email, purpose });

  // Immediately asking for another code throws CodeCooldownError
  await assert.rejects(
    async () => {
      await createCode(db, { email, purpose });
    },
    (err) => err instanceof CodeCooldownError && err.secondsLeft > 0
  );
});
