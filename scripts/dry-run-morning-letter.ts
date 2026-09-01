/**
 * Dry-run: Google Drive / Docs / Sheets / Forms URLs must not appear as href
 * in morning-letter HTML (Gmail turns those into Drive attachment chips).
 * Also: desk_original leads credit the covering desks, not traverse.news.
 *
 *   npx tsx scripts/dry-run-morning-letter.ts
 */
import assert from "node:assert/strict";
import {
  buildMorningLetter,
  letterSourceCredit,
} from "../src/lib/email-letter";
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

// --- Desk original: credit covering desks, never traverse.news as source ---
assert.equal(
  letterSourceCredit([
    "9&10 News",
    "Record-Eagle",
    "UpNorthLive",
    "traverse.news",
    "Traverse News",
    "",
  ]),
  "9&10 News · Record-Eagle · UpNorthLive",
  "filters own masthead and empties from source credit",
);
assert.equal(
  letterSourceCredit(["traverse.news", "Traverse News", ""]),
  "",
  "all-masthead sources omit the credit line",
);

const deskOriginalSnapshot: EmailEditionSnapshot = {
  date: "2026-09-01",
  captured_at: "2026-09-01T12:00:00.000Z",
  lead: {
    title: "South Airport Road crash closes lanes Monday morning",
    dek: "Local desks covered the break; staff original synthesizes the wire.",
    url: "https://traverse.news/story/south-airport-road-crash",
    sources: ["9&10 News", "Record-Eagle", "UpNorthLive", "traverse.news"],
    paywalled: true,
    desk_original: true,
  },
  around: [],
  alerts: [],
  tonight: [],
  civic: [],
  sports: [],
};

const deskLetter = buildMorningLetter(deskOriginalSnapshot);
const creditPlain = "9&10 News · Record-Eagle · UpNorthLive";
const creditHtml = "9&amp;10 News · Record-Eagle · UpNorthLive";

assert.match(
  deskLetter.html,
  new RegExp(`${creditHtml} · Paywall`),
  "desk_original lead HTML credits covering desks + Paywall",
);
assert.match(
  deskLetter.text,
  new RegExp(`${creditPlain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} · Paywall`),
  "desk_original lead plaintext credits covering desks + Paywall",
);

// Source-line paragraph must not be a lone "traverse.news" credit.
assert.doesNotMatch(
  deskLetter.html,
  /font-size:12px;color:#666666;">traverse\.news( · Paywall)?<\/p>/,
  "desk_original must not print traverse.news as the source line",
);
// Story credit is the line after the dek — must not be our masthead alone.
assert.match(
  deskLetter.text,
  /staff original synthesizes the wire\.\n9&10 News · Record-Eagle · UpNorthLive · Paywall\n/,
  "source credit line after dek is the covering desks, not traverse.news",
);

const mastheadOnly: EmailEditionSnapshot = {
  ...deskOriginalSnapshot,
  lead: {
    ...deskOriginalSnapshot.lead!,
    sources: ["traverse.news"],
    paywalled: false,
  },
};
const mastheadLetter = buildMorningLetter(mastheadOnly);
assert.doesNotMatch(
  mastheadLetter.html,
  /font-size:12px;color:#666666;">/,
  "when only own masthead remains, omit the source line entirely",
);

console.log(
  "dry-run-morning-letter: ok (Drive/Sheets unlinked; desk_original credits desks)",
);
