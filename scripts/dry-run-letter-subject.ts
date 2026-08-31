/**
 * Dry-run: Saturday-style morning letter subject prefers 3 news phrases,
 * maps Stimson reconstruction to "Stimson Street Project", and skips sports.
 * Also refuses the 8/31 truncated failures ("Driver Charged in Center",
 * "Sheriff's office looking").
 *
 *   npx tsx scripts/dry-run-letter-subject.ts
 */
import assert from "node:assert/strict";
import { buildMorningLetterSubject } from "../src/lib/email-letter";
import type { EmailEditionSnapshot } from "../src/lib/types";

const saturdaySnapshot: EmailEditionSnapshot = {
  date: "2026-08-29",
  captured_at: "2026-08-29T12:00:00.000Z",
  lead: null,
  around: [
    {
      title: "Decrease in Parking Rates Coming After Labor Day",
      dek: "Downtown parking rates shift after Labor Day.",
      url: "https://www.traverseticker.com/news/parking-rates/",
      sources: ["The Ticker"],
    },
    {
      title: "Stimson Street reconstruction project begins Monday in Cadillac",
      dek: "Road and utility work along Stimson Street.",
      url: "https://www.9and10news.com/2026/08/28/stimson-street/",
      sources: ["9&10 News"],
    },
    {
      title: "Old Neighborhood on the North Shore",
      dek: "Glen Eyrie going strong for a century and more",
      url: "https://betsiecurrent.com/old-neighborhood/",
      sources: ["The Betsie Current"],
    },
    {
      title: "High school football week 1 Friday scores and highlights",
      dek: "Scores.",
      url: "https://www.9and10news.com/sports/week-1/",
      sources: ["9&10 News", "9&10 Sports"],
    },
    {
      title: "Prep roundup: Rayder comeback defeats Red Devils",
      dek: "Charlevoix win.",
      url: "https://www.record-eagle.com/sports/prep-roundup",
      sources: ["Record-Eagle Sports", "Record-Eagle Local Sports"],
      paywalled: true,
    },
  ],
  alerts: [
    {
      title: "MDOT announces nighttime detour for US-31 in Traverse City",
      dek: "Night work next week.",
      url: "https://www.facebook.com/TraverseCityTicker/posts/us31",
      source_name: "Ticker (Facebook)",
    },
    {
      title:
        "Bat found in local home tests positive for rabies; health department warns community",
      dek: "GTCHD warning.",
      url: "https://www.facebook.com/TraverseCityTicker/posts/rabies",
      source_name: "Ticker (Facebook)",
    },
  ],
  tonight: [
    {
      title: "Wigglers Storytime",
      starts_at: "2026-09-01T14:30:00.000Z",
      place: "Kingsley Branch Library",
      url: "https://www.tadl.org/event/wigglers",
    },
  ],
  civic: [],
  sports: [],
};

const subject = buildMorningLetterSubject(saturdaySnapshot);
const phrasePart = subject.replace(/^🗞️\s*/, "");
const phraseLen = phrasePart.length;

assert.match(subject, /^🗞️ /);
assert.match(subject, /Stimson Street Project/);
assert.doesNotMatch(subject, /Stimson Street(?! Project)/);
assert.match(subject, /Decrease in Parking Rates/);
assert.match(subject, /Bat tests positive for rabies/);
assert.doesNotMatch(subject, /scores and highlights|Prep roundup|defeats|Wigglers|Old Neighborhood|Glen Eyrie/i);
assert.equal(
  subject,
  "🗞️ Decrease in Parking Rates · Stimson Street Project · Bat tests positive for rabies",
);
assert.ok(phraseLen <= 84, `phrase length ${phraseLen} must be ≤84`);
assert.ok(
  subject.split(" · ").length === 3,
  "prefer three news phrases when they parse",
);

// --- 8/31 failure cases: truncated verb / "in Center" must never ship ---
const aug31Snapshot: EmailEditionSnapshot = {
  date: "2026-08-31",
  captured_at: "2026-08-31T12:00:00.000Z",
  lead: null,
  around: [
    {
      title:
        "Work in Leelanau Co. but can't afford to live there? Housing advocates want to hear from you",
      dek: "Housing survey.",
      url: "https://www.interlochenpublicradio.org/2026-08-24/leelanau-housing",
      sources: ["IPR News"],
    },
    {
      title: "Driver Charged in Center Road Crash That Killed Teenager, Bond Set",
      dek: "Acme crash charges.",
      url: "https://www.oldmission.net/2026/08/driver-charged-center-road/",
      sources: ["Old Mission Gazette"],
    },
    {
      title:
        "Sheriff's office looking for information on weekend burglary in Garfield Township",
      dek: "Tips sought.",
      url: "https://www.traverseticker.com/news/sheriff-looking-burglary/",
      sources: ["The Ticker"],
    },
  ],
  alerts: [],
  tonight: [],
  civic: [],
  sports: [],
};

const aug31 = buildMorningLetterSubject(aug31Snapshot);
assert.match(aug31, /^🗞️ /);
assert.match(aug31, /Leelanau housing survey/);
assert.doesNotMatch(
  aug31,
  /Driver Charged in Center(?! Road)|Sheriff'?s office looking\b/i,
);
assert.doesNotMatch(aug31, /\bin Center ·|· Driver Charged in Center$/i);
// Broken phrases must not appear as subject slots.
assert.ok(
  !aug31.includes("Driver Charged in Center ·") &&
    !aug31.endsWith("Driver Charged in Center") &&
    !/Driver Charged in Center(?! Road)/.test(aug31),
  `must refuse truncated Center Road cut: ${aug31}`,
);
assert.ok(
  !/Sheriff'?s office looking\b/i.test(aug31),
  `must refuse dangling looking: ${aug31}`,
);
// Stranger-parseable replacements (or skip) — never the broken 8/31 subject.
assert.notEqual(
  aug31,
  "🗞️ Leelanau housing survey · Driver Charged in Center · Sheriff's office looking",
);
assert.ok(
  /Center Road crash|Sheriff seeks/i.test(aug31),
  `expected complete crash/sheriff phrases, got: ${aug31}`,
);
const aug31Len = aug31.replace(/^🗞️\s*/, "").length;
assert.ok(aug31Len <= 84, `aug31 phrase length ${aug31Len} must be ≤84`);

// Direct refusal of the exact broken phrases as sole candidates.
const brokenOnly: EmailEditionSnapshot = {
  date: "2026-08-31",
  captured_at: "2026-08-31T12:00:00.000Z",
  lead: null,
  around: [
    {
      title: "Driver Charged in Center Road Crash Near Acme",
      dek: "",
      url: "https://example.com/center-road",
      sources: ["The Ticker"],
    },
    {
      title: "Sheriff's office looking for information on weekend burglary",
      dek: "",
      url: "https://example.com/sheriff-looking",
      sources: ["The Ticker"],
    },
  ],
  alerts: [],
  tonight: [],
  civic: [],
  sports: [],
};
const brokenSubject = buildMorningLetterSubject(brokenOnly);
assert.doesNotMatch(
  brokenSubject,
  /Driver Charged in Center(?! Road)|Sheriff'?s office looking\b/i,
);
assert.ok(
  /Center Road crash|Sheriff seeks|Driver charged in Center Road crash/i.test(
    brokenSubject,
  ),
  `broken-only must compress to parseable phrases: ${brokenSubject}`,
);

console.log(
  `dry-run-letter-subject: ok\n  subject=${subject}\n  phraseLen=${phraseLen}\n  aug31=${aug31}\n  brokenOnly=${brokenSubject}`,
);
