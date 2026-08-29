/**
 * Smoke test: Active ↔ Unsubscribed moves (memory store only).
 * Run: npx tsx scripts/smoke-unsubscribed.ts
 */
import assert from "node:assert/strict";
import {
  addSubscriber,
  removeSubscriber,
  resetMemoryStore,
  getMemoryStore,
} from "../src/lib/data/store";

async function main() {
  resetMemoryStore();

  const a = await addSubscriber("Ada@Example.com");
  assert.equal(a.email, "ada@example.com");
  assert.equal(getMemoryStore().subscribers.length, 1);
  assert.equal(getMemoryStore().unsubscribed.length, 0);

  const moved = await removeSubscriber("ada@example.com");
  assert.equal(moved.moved, true);
  assert.equal(moved.already, false);
  assert.equal(getMemoryStore().subscribers.length, 0);
  assert.equal(getMemoryStore().unsubscribed.length, 1);
  assert.equal(getMemoryStore().unsubscribed[0]?.email, "ada@example.com");
  assert.ok(getMemoryStore().unsubscribed[0]?.created_at);
  assert.ok(getMemoryStore().unsubscribed[0]?.unsubscribed_at);

  const again = await removeSubscriber("ada@example.com");
  assert.equal(again.moved, false);
  assert.equal(again.already, true);
  assert.equal(getMemoryStore().unsubscribed.length, 1);

  const unknown = await removeSubscriber("nobody@example.com");
  assert.equal(unknown.moved, false);
  assert.equal(unknown.already, false);

  const back = await addSubscriber("ada@example.com");
  assert.equal(back.email, "ada@example.com");
  assert.equal(getMemoryStore().subscribers.length, 1);
  assert.equal(getMemoryStore().unsubscribed.length, 0);
  // Fresh signup timestamp on rejoin.
  assert.notEqual(back.created_at, a.created_at);

  // Existing active: scrub any stray unsubscribed row.
  getMemoryStore().unsubscribed.push({
    email: "ada@example.com",
    unsubscribed_at: new Date().toISOString(),
  });
  const still = await addSubscriber("ada@example.com");
  assert.equal(still.email, "ada@example.com");
  assert.equal(getMemoryStore().unsubscribed.length, 0);

  console.log("smoke-unsubscribed: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
