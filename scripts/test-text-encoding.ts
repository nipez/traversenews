/**
 * Prove mojibake repair for morning-letter / public copy.
 *
 *   npx tsx scripts/test-text-encoding.ts
 */
import assert from "node:assert/strict";
import {
  buildMorningLetter,
  sanitizeEmailEditionSnapshot,
} from "../src/lib/email-letter";
import {
  hasMojibake,
  repairUtf8Mojibake,
  sanitizePublicText,
} from "../src/lib/text-encoding";
import type { EmailEditionSnapshot } from "../src/lib/types";

/** Simulate UTF-8 bytes mis-decoded as Latin-1 (Workers rss-parser bug). */
function utf8AsLatin1(s: string): string {
  const bytes = new TextEncoder().encode(s);
  return String.fromCharCode(...bytes);
}

const clean =
  "TRAVERSE CITY — Congressman John James… TCAPS’ schools you'll love.";
const mangled = utf8AsLatin1(clean);

assert.ok(hasMojibake(mangled), "fixture looks like mojibake");
assert.equal(
  repairUtf8Mojibake(mangled),
  clean,
  "latin1 mis-decode round-trips to clean UTF-8",
);

// Live-site pattern: TCAPS + curly apostrophe double-encoded
const liveTitle = `TCAPS${String.fromCharCode(0xe2, 0x80, 0x99)} 2026 Outcomes`;
assert.equal(
  sanitizePublicText(liveTitle),
  "TCAPS\u2019 2026 Outcomes",
  "repairs live TCAPS title apostrophe",
);

const liveDek = `TRAVERSE CITY ${String.fromCharCode(0xe2, 0x80, 0x94)} Congressman`;
assert.equal(
  sanitizePublicText(liveDek),
  "TRAVERSE CITY \u2014 Congressman",
  "repairs live Record-Eagle em-dash",
);

const liveEllipsis = `contex${String.fromCharCode(0xe2, 0x80, 0xa6)}`;
assert.equal(
  sanitizePublicText(liveEllipsis),
  "contex\u2026",
  "repairs live truncated ellipsis",
);

// Windows-1252 display form (Gmail screenshot spelling)
assert.equal(
  sanitizePublicText("you\u00E2\u20AC\u2122ll"),
  "you\u2019ll",
  "repairs windows-1252 â€™ apostrophe",
);

assert.equal(
  sanitizePublicText("Hello world"),
  "Hello world",
  "clean ASCII is untouched",
);
assert.equal(
  sanitizePublicText("TCAPS\u2019 already good"),
  "TCAPS\u2019 already good",
  "already-correct curly punct is untouched",
);

const snapshot: EmailEditionSnapshot = {
  date: "2026-09-14",
  captured_at: new Date().toISOString(),
  weather_line: null,
  lead: null,
  around: [
    {
      title: liveTitle,
      dek: liveDek,
      url: "https://www.record-eagle.com/example",
      sources: ["Record-Eagle"],
      paywalled: true,
    },
    {
      title: liveTitle,
      dek: `Below you${String.fromCharCode(0xe2, 0x80, 0x99)}ll find a snapshot. I${String.fromCharCode(0xe2, 0x80, 0x99)}ve included years of data for contex${String.fromCharCode(0xe2, 0x80, 0xa6)}`,
      url: "https://tyschmidt.net/example",
      sources: ["Ty Schmidt"],
      paywalled: false,
    },
  ],
  alerts: [],
  tonight: [],
  civic: [],
  sports: [],
};

const healed = sanitizeEmailEditionSnapshot(snapshot);
assert.ok(
  !hasMojibake(healed.around[0]!.title) &&
    !hasMojibake(healed.around[0]!.dek) &&
    !hasMojibake(healed.around[1]!.dek),
  "sanitizeEmailEditionSnapshot clears mojibake markers",
);

const letter = buildMorningLetter(snapshot);
assert.match(
  letter.html,
  /charset=utf-8/i,
  "letter HTML declares charset=utf-8",
);
assert.match(
  letter.html,
  /Content-Type" content="text\/html; charset=utf-8"/,
  "letter HTML has http-equiv UTF-8 Content-Type",
);
assert.doesNotMatch(
  letter.html,
  /â€|Ã.|Ã¡|\u00E2\u0080/,
  "fresh letter HTML has no mojibake sequences",
);
assert.match(letter.html, /TCAPS\u2019/, "letter keeps curly apostrophe as UTF-8");
assert.match(letter.html, /\u2014/, "letter keeps em-dash as UTF-8");
assert.match(letter.text, /you\u2019ll/, "plain-text part is also repaired");

console.log("test-text-encoding: ok");
