/**
 * Desk pull flash copy for POST /api/pull results.
 *
 *   npx tsx scripts/test-desk-pull-flash.ts
 */
import assert from "node:assert/strict";
import { formatPullFlash } from "../src/lib/desk/pull-flash";

const ok = formatPullFlash(
  {
    ok: true,
    storiesAdded: 12,
    eventsAdded: 1,
    showsAdded: 0,
    errors: [],
    last_pull_at: "2026-09-08T12:00:00.000Z",
  },
  true,
);
assert.equal(ok.ok, true);
assert.match(ok.text, /12 stories/);
assert.match(ok.text, /1 event/);
assert.match(ok.text, /0 shows/);
assert.match(ok.text, /Locked Around mix and subject stay put/);

const singular = formatPullFlash(
  {
    ok: true,
    storiesAdded: 1,
    eventsAdded: 1,
    showsAdded: 1,
    errors: [],
  },
  true,
);
assert.match(singular.text, /1 story · 1 event · 1 show/);

const withErrors = formatPullFlash(
  {
    ok: false,
    storiesAdded: 3,
    eventsAdded: 2,
    showsAdded: 4,
    errors: [
      { source: "Visit TC", error: "403" },
      { source: "AMC", error: "bot-blocked" },
    ],
  },
  true,
);
assert.equal(withErrors.ok, false);
assert.match(withErrors.text, /2 source errors/);
assert.match(withErrors.text, /3 stories · 2 events · 4 shows/);

const httpFail = formatPullFlash(null, false);
assert.equal(httpFail.ok, false);
assert.match(httpFail.text, /Pull failed/);

console.log("ok — desk pull flash");
