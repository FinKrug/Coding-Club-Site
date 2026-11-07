import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword, fakeVerify } from "../../lib/password.js";

// Set a test pepper for testing
process.env.PASSWORD_PEPPER = "test-secret-pepper-must-be-at-least-32-chars-long";

test("password.js - hash and verify with correct password", async () => {
  const password = "SuperSecretPassword123!";
  const hash = await hashPassword(password);

  assert.ok(typeof hash === "string");
  assert.ok(hash.startsWith("pbkdf2-sha256$30000$"));

  const result = await verifyPassword(password, hash);
  assert.deepEqual(result, { ok: true, needsRehash: false });
});

test("password.js - verify rejects incorrect password", async () => {
  const password = "CorrectPassword!";
  const hash = await hashPassword(password);

  const result = await verifyPassword("WrongPassword!", hash);
  assert.deepEqual(result, { ok: false, needsRehash: false });
});

test("password.js - verify gracefully handles malformed stored strings", async () => {
  assert.deepEqual(await verifyPassword("test", ""), { ok: false, needsRehash: false });
  assert.deepEqual(await verifyPassword("test", "not-a-hash"), { ok: false, needsRehash: false });
  assert.deepEqual(await verifyPassword("test", "pbkdf2-sha256$bad$bad$bad"), { ok: false, needsRehash: false });
  assert.deepEqual(await verifyPassword("test", "pbkdf2-sha256$30000$invalidbase64!$invalidbase64!"), {
    ok: false,
    needsRehash: false,
  });
});

test("password.js - fakeVerify executes without throwing", async () => {
  await assert.doesNotReject(async () => {
    await fakeVerify("arbitrary-password");
  });
});
