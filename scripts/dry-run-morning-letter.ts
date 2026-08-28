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
  lead: {
    title: "Garfield Township freezes data centers for a year",
    dek: "A pause while planners rewrite the zoning rules.",
    url: "https://traverse.news/story/garfield-data-centers",
    sources: ["traverse.news"],
  },
  around: [],
  alerts: [
    {
      title: "High wind advisory for Grand Traverse County",
      dek: "Gusts near 50 mph through evening.",
      url: "https://www.weather.gov/",
      source_name: "NWS",
    },
  ],
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

// Title block, blank-line spacer, then dek (Gmail collapses tiny margins).
assert.match(
  letter.html,
  /Garfield Township freezes data centers for a year<\/a><\/p>\s*<p style="margin:0;padding:0;font-size:14px;line-height:18px;height:18px;">&nbsp;<\/p>\s*<p[^>]*>A pause while planners rewrite the zoning rules\.<\/p>/,
  "story title and dek must be separated by a blank-line spacer",
);
assert.match(
  letter.html,
  /High wind advisory for Grand Traverse County<\/a><\/p>\s*<p style="margin:0;padding:0;font-size:14px;line-height:18px;height:18px;">&nbsp;<\/p>\s*<p[^>]*>Gusts near 50 mph through evening\.<\/p>/,
  "alert title and dek must be separated by a blank-line spacer",
);
assert.match(
  letter.text,
  /Garfield Township freezes data centers for a year https:\/\/traverse\.news\/story\/garfield-data-centers\n\nA pause while planners rewrite the zoning rules\./,
  "plaintext title and dek must keep a blank line between them",
);

assert.match(
  letter.html,
  /href=["']https:\/\/traverse\.news\/unsubscribe["']/,
  "footer must include Unsubscribe / Opt out",
);
assert.match(
  letter.html,
  />Unsubscribe \/ Opt out</,
  "footer link label is Unsubscribe / Opt out",
);
assert.match(
  letter.text,
  /Unsubscribe \/ Opt out: https:\/\/traverse\.news\/unsubscribe/,
  "plaintext footer must include Unsubscribe / Opt out",
);

const personalized = buildMorningLetter(snapshot, {
  unsubscribeEmail: "reader@example.com",
});
assert.match(
  personalized.html,
  /href=["']https:\/\/traverse\.news\/unsubscribe\?email=reader%40example\.com["']/,
  "single-recipient send may personalize Unsubscribe",
);

console.log("dry-run-morning-letter: ok (Drive/Sheets unlinked; title/dek gap; unsubscribe)");
