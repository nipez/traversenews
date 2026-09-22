/**
 * Fail-closed Desk morning-letter send contract (2026-09-22 incident).
 *
 * Empty `{}` must never mean live. Explicit preview/live only.
 * Second live without confirm_second_live is blocked.
 *
 *   npm run test:letter-send-mode
 */
import assert from "node:assert/strict";
import {
  isSecondLiveSendBlocked,
  resolveDeskLetterSendMode,
  SECOND_LIVE_SEND_ERROR,
} from "../src/lib/email-letter-send-mode";

// --- Empty / ambiguous → reject (would be HTTP 400; no send) ---
const empty = resolveDeskLetterSendMode({});
assert.equal(empty.ok, false, "empty {} must reject");
if (!empty.ok) {
  assert.match(empty.error, /explicit mode/i);
}

const aroundOnly = resolveDeskLetterSendMode({});
assert.equal(
  aroundOnly.ok,
  false,
  "missing mode (including old Desk live shape with only around) must reject",
);

assert.equal(
  resolveDeskLetterSendMode({ preview: false }).ok,
  false,
  "preview:false alone is not live",
);
assert.equal(
  resolveDeskLetterSendMode({ live: true }).ok,
  false,
  "live:true without preview:false must reject",
);
assert.equal(
  resolveDeskLetterSendMode({ preview: true, live: true }).ok,
  false,
  "preview+live both true is ambiguous",
);
assert.equal(
  resolveDeskLetterSendMode({ mode: "nope" }).ok,
  false,
  "unknown mode string rejects",
);
assert.equal(
  resolveDeskLetterSendMode({ mode: "live", preview: true }).ok,
  false,
  "mode:live with preview:true is ambiguous",
);
assert.equal(
  resolveDeskLetterSendMode({ mode: "preview", live: true }).ok,
  false,
  "mode:preview with live:true is ambiguous",
);

// --- Explicit preview → ok ---
const previewFlag = resolveDeskLetterSendMode({ preview: true });
assert.deepEqual(previewFlag, { ok: true, mode: "preview" });

const previewMode = resolveDeskLetterSendMode({ mode: "preview" });
assert.deepEqual(previewMode, { ok: true, mode: "preview" });

assert.deepEqual(
  resolveDeskLetterSendMode({ preview: true, live: false }),
  { ok: true, mode: "preview" },
);
assert.deepEqual(
  resolveDeskLetterSendMode({ mode: "preview", preview: true }),
  { ok: true, mode: "preview" },
);

// --- Explicit live → ok ---
const liveFlags = resolveDeskLetterSendMode({
  live: true,
  preview: false,
});
assert.deepEqual(liveFlags, { ok: true, mode: "live" });

const liveMode = resolveDeskLetterSendMode({ mode: "live" });
assert.deepEqual(liveMode, { ok: true, mode: "live" });

assert.deepEqual(
  resolveDeskLetterSendMode({ mode: "live", live: true, preview: false }),
  { ok: true, mode: "live" },
);

// --- Same-edition second live guard (would be HTTP 409; no send) ---
assert.equal(
  isSecondLiveSendBlocked(true, false),
  true,
  "prior live without override blocks",
);
assert.equal(
  isSecondLiveSendBlocked(true, true),
  false,
  "confirm_second_live allows second live",
);
assert.equal(
  isSecondLiveSendBlocked(false, false),
  false,
  "first live is not blocked",
);
assert.match(SECOND_LIVE_SEND_ERROR, /confirm_second_live/);

console.log("test-letter-send-mode: ok");
