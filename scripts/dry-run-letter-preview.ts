/**
 * Dry-run: morning letter preview quarantine helpers.
 *
 *   npx tsx scripts/dry-run-letter-preview.ts
 */
import assert from "node:assert/strict";
import {
  DESK_LETTER_FALLBACK,
  morningLetterPreviewKvKey,
  morningLetterSentKvKey,
  PREVIEW_SUBJECT_PREFIX,
  previewLetterSubject,
  resolveLetterRecipients,
  resolvePreviewLetterRecipients,
} from "../src/lib/email-letter";
import type { Subscriber } from "../src/lib/types";

assert.equal(DESK_LETTER_FALLBACK, "nickperez@gmail.com");
assert.equal(PREVIEW_SUBJECT_PREFIX, "Preview · ");
assert.equal(
  previewLetterSubject("TC schools, bay fire, civic tonight"),
  "Preview · TC schools, bay fire, civic tonight",
);
assert.equal(
  morningLetterPreviewKvKey("2026-08-27"),
  "morning_letter_preview:2026-08-27",
);
assert.equal(
  morningLetterSentKvKey("2026-08-27"),
  "morning_letter_sent:2026-08-27",
);
assert.notEqual(
  morningLetterPreviewKvKey("2026-08-27"),
  morningLetterSentKvKey("2026-08-27"),
);

const previewTo = resolvePreviewLetterRecipients();
assert.deepEqual(previewTo, ["nickperez@gmail.com"]);
assert.equal(previewTo.length, 1);

const fakeList: Subscriber[] = [
  {
    email: "desk-list-verify@example.com",
    created_at: "2026-08-01T12:00:00.000Z",
  },
];
assert.deepEqual(resolveLetterRecipients(fakeList), [
  "nickperez@gmail.com",
]);

console.log("dry-run-letter-preview: ok");
