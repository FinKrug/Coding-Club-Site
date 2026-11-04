import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_LOCAL_MONGODB_URI, withDb } from "../../lib/mongodb.js";

test("mongodb.js - DEFAULT_LOCAL_MONGODB_URI is valid local connection string", () => {
  assert.equal(DEFAULT_LOCAL_MONGODB_URI, "mongodb://127.0.0.1:27017/coding-club");
});

test("mongodb.js - withDb attempts connection with default local URI when MONGODB_URI is unset", async () => {
  const originalUri = process.env.MONGODB_URI;
  try {
    delete process.env.MONGODB_URI;
    // Calling withDb should attempt to connect to the local URI.
    // In test environment without a running mongod, it should fail with connection error (e.g. ECONNREFUSED),
    // NOT with the previous "MONGODB_URI is not set" configuration error.
    await assert.rejects(
      async () => {
        await withDb(async () => {});
      },
      (err) => {
        assert.notEqual(err.message, "MONGODB_URI is not set. See the 'Accounts & Database' section of the README.");
        return true;
      }
    );
  } finally {
    if (originalUri !== undefined) {
      process.env.MONGODB_URI = originalUri;
    }
  }
});
