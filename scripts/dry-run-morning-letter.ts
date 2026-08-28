/**
 * Dry-run: Google Drive / Docs / Sheets / Forms URLs must not appear as href
 * in morning-letter HTML (Gmail turns those into Drive attachment chips).
 *
 *   npx tsx scripts/dry-run-morning-letter.ts
 */
import assert from "node:assert/strict";
import { buildMorningLetter } from "../src/lib/email-letter";
import type { EmailEditionSnapshot } from "../src/lib/types";

const SHEETS_URL =
  "https://docs.google.com/spreadsheets/d/1DSv_Vgmz5Lz-b_DHQYcLzI0Ex99fS0qmg2IErJMsnM0/edit?usp=sharing";

const snapshot: EmailEditionSnapshot = {
  date: "2026-08-25",
  captured_at: "2026-08-25T12:00:00.000Z",
  lead: null,
  around: [],
  alerts: [],
  tonight: [],
  civic: [],
  sports: [
    {
      title: "VARSITY SOCCER @ KALKASKA",
      starts_at: "2026-08-25T23:00:00.000Z",
      place: "Traverse City area",
      url: SHEETS_URL,
      school: "TC Christian",
    },
  ],
};

const letter = buildMorningLetter(snapshot);

assert.match(
  letter.html,
  /VARSITY SOCCER @ KALKASKA/,
  "title must remain in the letter",
);
assert.match(
  letter.html,
  /TC Christian/,
  "school/dek context must remain",
);
assert.doesNotMatch(
  letter.html,
  /href=["'][^"']*docs\.google\.com/,
  "docs.google.com must not appear as an href in HTML",
);
assert.doesNotMatch(
  letter.html,
  /href=["'][^"']*drive\.google\.com/,
  "drive.google.com must not appear as an href in HTML",
);
assert.match(
  letter.html,
  /<strong>VARSITY SOCCER @ KALKASKA<\/strong>/,
  "Drive-linked titles should render as plain strong text",
);
assert.doesNotMatch(
  letter.text,
  /docs\.google\.com/,
  "docs.google.com must not appear in plaintext either",
);
assert.match(
  letter.html,
  /href=["']https:\/\/traverse\.news\/sports["']/,
  "section heads may still link to /sports",
);
assert.match(
  letter.html,
  /href=["']https:\/\/traverse\.news\/email\/unsubscribe["']/,
  "footer must include Unsubscribe",
);
assert.match(
  letter.text,
  /Unsubscribe: https:\/\/traverse\.news\/email\/unsubscribe/,
  "plaintext footer must include Unsubscribe",
);

const personalized = buildMorningLetter(snapshot, {
  unsubscribeEmail: "reader@example.com",
});
assert.match(
  personalized.html,
  /href=["']https:\/\/traverse\.news\/email\/unsubscribe\?email=reader%40example\.com["']/,
  "single-recipient send may personalize Unsubscribe",
);

console.log("dry-run-morning-letter: ok (Drive/Sheets URLs stay unlinked)");
