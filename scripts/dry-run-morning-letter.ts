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

/** Today's live mix (Fri Aug 28): real titles only — do not invent. */
const todaySubjectSnapshot: EmailEditionSnapshot = {
  date: "2026-08-28",
  captured_at: "2026-08-28T12:00:00.000Z",
  lead: {
    title: "Garfield Township freezes data centers for a year",
    dek: "Trustees voted unanimously Tuesday.",
    url: "https://traverse.news/story/garfield-township-freezes-data-centers-for-a-year",
    sources: ["traverse.news"],
  },
  around: [
    {
      title: "No Body Contact Advisory Issued for Boardman River/Lake",
      dek: "Stale advisory card — subject must walk past this.",
      url: "https://example.com/boardman-advisory",
      sources: ["Grand Traverse 911"],
    },
    {
      title:
        "Could wildfire smoke change the flavor of wine grapes in northern Michigan?",
      dek: "When wildfire smoke blanketed northern Michigan skies…",
      url: "https://glenarborsun.com/could-wildfire-smoke-change-the-flavor-of-wine-grapes-in-northern-michigan/",
      sources: ["Glen Arbor Sun"],
    },
  ],
  alerts: [],
  tonight: [
    {
      title: "Sing & Stomp",
      starts_at: "2026-08-28T14:00:00.000Z",
      place: "East Bay Branch Library",
      url: null,
    },
    {
      title: "Simon Anton Artist Talk",
      starts_at: "2026-08-28T21:00:00.000Z",
      place: "Dennos Museum Center",
      url: null,
    },
    {
      title: "Full Circle Artist Reception",
      starts_at: "2026-08-28T22:30:00.000Z",
      place: "Dennos Museum Center",
      url: null,
    },
  ],
  civic: [],
  sports: [],
};

const todaySubject = buildMorningLetter(todaySubjectSnapshot).subject;
assert.match(
  todaySubject,
  /Garfield Township freezes data centers for a year/,
  "lead closer 'for a year' must stay (not chop onto 'for')",
);
assert.doesNotMatch(
  todaySubject,
  /\bfor\s*(?:⚡️|🌙|🌊|🚨|,|$)/,
  "subject must not end a phrase on trailing 'for'",
);
assert.doesNotMatch(
  todaySubject,
  /Sing\s*&\s*Stomp/,
  "morning kids/storytime skipped when Dennos evening exists",
);
assert.match(
  todaySubject,
  /Simon Anton Artist Talk/,
  "prefer Dennos / 4pm+ night over Sing & Stomp",
);
assert.doesNotMatch(
  todaySubject,
  /No Body Contact Advisory|Boardman River\/Lake/,
  "skip stale Boardman body-contact advisory for around",
);
assert.match(
  todaySubject,
  /wildfire smoke|wine grapes/i,
  "next usable bay head (smoke / wine grapes) in subject",
);
assert.match(todaySubject, /⚡️/);
assert.match(todaySubject, /🌙/);
assert.match(todaySubject, /🌊/);

console.log(
  `dry-run-morning-letter: ok (Drive unlinked; subject=${todaySubject})`,
);