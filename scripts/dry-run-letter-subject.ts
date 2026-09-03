/**
 * Dry-run: Saturday-style morning letter subject prefers 3 news phrases,
 * maps Stimson reconstruction to "Stimson Street Project", and skips sports.
 * Also refuses truncated failures — first 8/31 ("Driver Charged in Center",
 * "Sheriff's office looking"), the second preview ("Teaching Kids in the
 * Age", sheriff looking, Center stump), and 9/3 ("to purchase new",
 * "boy faces", duplicate toddler).
 *
 *   npx tsx scripts/dry-run-letter-subject.ts
 *   npm run dry-run:letter-subject
 */
import assert from "node:assert/strict";
import {
  buildMorningLetterSubject,
  usableSubjectPhrase,
} from "../src/lib/email-letter";
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

// --- Second 8/31 preview: Age stump + sheriff looking + Center ---
const SECOND_PREVIEW_BROKEN =
  "🗞️ Leelanau housing survey · Sheriff's office looking · Teaching Kids in the Age";

const secondPreviewSnapshot: EmailEditionSnapshot = {
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
      title:
        "Sheriff's office looking for witnesses after weekend crash near Acme",
      dek: "Witnesses sought.",
      url: "https://www.traverseticker.com/news/sheriff-crash-witnesses/",
      sources: ["The Ticker"],
    },
    {
      title: "Teaching Kids in the Age of Artificial Intelligence",
      dek: "Classroom AI.",
      url: "https://www.traverseticker.com/news/teaching-kids-ai/",
      sources: ["The Ticker"],
    },
  ],
  alerts: [],
  tonight: [],
  civic: [],
  sports: [],
};

const secondPreview = buildMorningLetterSubject(secondPreviewSnapshot);
assert.notEqual(secondPreview, SECOND_PREVIEW_BROKEN);
assert.doesNotMatch(
  secondPreview,
  /Sheriff'?s office looking\b|Teaching Kids in the Age(?! of AI)|Driver Charged in Center(?! Road)/i,
);
// Three broken tails must never appear as subject slots.
assert.ok(
  !/Sheriff'?s office looking\b/i.test(secondPreview),
  `must refuse dangling looking: ${secondPreview}`,
);
assert.ok(
  !/Teaching Kids in the Age(?! of AI)/i.test(secondPreview),
  `must refuse Age stump: ${secondPreview}`,
);
assert.ok(
  !/Driver Charged in Center(?! Road)/i.test(secondPreview),
  `must refuse Center stump: ${secondPreview}`,
);
assert.match(secondPreview, /Leelanau housing survey/);
assert.match(secondPreview, /Sheriff seeks crash witnesses/);
assert.ok(
  /Teaching kids in the age of AI|Teaching kids on AI|TCAPS on classroom AI/i.test(
    secondPreview,
  ) || secondPreview.split(" · ").length === 2,
  `classroom AI must compress or yield 2 complete phrases, got: ${secondPreview}`,
);
assert.ok(
  !/\bSheriff seeks tips\b/.test(secondPreview),
  `witnesses must not compress to generic tips: ${secondPreview}`,
);
const secondLen = secondPreview.replace(/^🗞️\s*/, "").length;
assert.ok(secondLen <= 84, `second preview phrase length ${secondLen} must be ≤84`);
assert.ok(
  secondPreview.split(" · ").length >= 2,
  `expected ≥2 complete phrases: ${secondPreview}`,
);

// Force recut path: long complete phrases that exceed soft cap — never Age stump.
const recutSnapshot: EmailEditionSnapshot = {
  date: "2026-08-31",
  captured_at: "2026-08-31T12:00:00.000Z",
  lead: null,
  around: [
    {
      title:
        "Work in Leelanau Co. but can't afford to live there? Housing advocates want to hear from you",
      dek: "",
      url: "https://ipr.org/leelanau",
      sources: ["IPR News"],
    },
    {
      title:
        "Grand Traverse County Sheriff's office looking for witnesses after weekend crash",
      dek: "",
      url: "https://ticker.example/sheriff-witnesses",
      sources: ["The Ticker"],
    },
    {
      title: "TCAPS workshop: Teaching Kids in the Age of Artificial Intelligence",
      dek: "",
      url: "https://ticker.example/tcaps-ai",
      sources: ["The Ticker"],
    },
  ],
  alerts: [],
  tonight: [],
  civic: [],
  sports: [],
};
const recutSubject = buildMorningLetterSubject(recutSnapshot);
assert.notEqual(recutSubject, SECOND_PREVIEW_BROKEN);
assert.doesNotMatch(
  recutSubject,
  /Sheriff'?s office looking\b|Teaching Kids in the Age(?! of AI)|in the Age ·|in the Age$/i,
);
assert.match(recutSubject, /Leelanau housing survey/);
assert.ok(
  /Sheriff seeks crash witnesses/i.test(recutSubject),
  `recut from original titles must see witnesses: ${recutSubject}`,
);
assert.ok(
  /TCAPS on classroom AI|Teaching kids in the age of AI/i.test(recutSubject) ||
    recutSubject.split(" · ").length === 2,
  `recut must compress AI or drop to 2 complete phrases: ${recutSubject}`,
);

// --- 2026-09-01: trailing "from" stump + South Airport / deputy recuts ---
const DEPUTY_SUV_TITLE =
  "Grand Traverse County deputy rescues two people from submerged SUV";
const SOUTH_AIRPORT_TITLE =
  "Westbound South Airport Road reopen after overnight crash near terminal";

const sept1Snapshot: EmailEditionSnapshot = {
  date: "2026-09-01",
  captured_at: "2026-09-01T12:00:00.000Z",
  lead: {
    title: SOUTH_AIRPORT_TITLE,
    dek: "Lanes reopen after overnight crash.",
    url: "https://traverse.news/2026/09/01/south-airport-reopen",
    sources: [],
    desk_original: true,
  },
  around: [
    {
      title: DEPUTY_SUV_TITLE,
      dek: "Two pulled from water.",
      url: "https://www.9and10news.com/2026/09/01/deputy-suv-rescue/",
      sources: ["9&10 News"],
    },
  ],
  alerts: [],
  tonight: [],
  civic: [],
  sports: [],
};

const sept1 = buildMorningLetterSubject(sept1Snapshot);
assert.match(sept1, /^🗞️ /);
assert.match(sept1, /Westbound South Airport reopens/);
assert.match(sept1, /Deputy rescues two from SUV/);
assert.doesNotMatch(sept1, /\bfrom ·|\bfrom$/i);
assert.doesNotMatch(
  sept1,
  /rescues two people from(?!\s+SUV)|Grand Traverse deputy rescues two people from$/i,
);
assert.equal(
  sept1,
  "🗞️ Westbound South Airport reopens · Deputy rescues two from SUV",
);

// Deputy title alone must never emit a phrase ending in "from".
const deputyOnly: EmailEditionSnapshot = {
  date: "2026-09-01",
  captured_at: "2026-09-01T12:00:00.000Z",
  lead: null,
  around: [
    {
      title: DEPUTY_SUV_TITLE,
      dek: "",
      url: "https://www.9and10news.com/2026/09/01/deputy-suv-rescue/",
      sources: ["9&10 News"],
    },
  ],
  alerts: [],
  tonight: [],
  civic: [],
  sports: [],
};
const deputySubject = buildMorningLetterSubject(deputyOnly);
assert.match(deputySubject, /Deputy rescues two from SUV/);
assert.doesNotMatch(deputySubject, /\bfrom ·|\bfrom$/i);
assert.notEqual(
  deputySubject,
  "🗞️ Grand Traverse deputy rescues two people from",
);

// ALL CAPS kicker alone must not appear as shouting.
const allCapsOnly: EmailEditionSnapshot = {
  date: "2026-09-01",
  captured_at: "2026-09-01T12:00:00.000Z",
  lead: null,
  around: [
    {
      title: "LEAGUE OF WOMEN VOTERS: Local ballot questions explained for fall",
      dek: "",
      url: "https://www.record-eagle.com/league-ballot",
      sources: ["Record-Eagle"],
      paywalled: true,
    },
    {
      title: "Decrease in Parking Rates Coming After Labor Day",
      dek: "",
      url: "https://www.traverseticker.com/news/parking-rates/",
      sources: ["The Ticker"],
    },
  ],
  alerts: [],
  tonight: [],
  civic: [],
  sports: [],
};
const allCapsSubject = buildMorningLetterSubject(allCapsOnly);
assert.doesNotMatch(allCapsSubject, /LEAGUE OF WOMEN VOTERS/);
assert.match(allCapsSubject, /Decrease in Parking Rates/);

// --- 2026-09-03: dangling "new" / "faces" + duplicate toddler must never ship ---
const THURSDAY_BROKEN =
  "🗞️ North Ed to purchase new · 1-year-old Acme boy faces · One-Year-Old Hospitalized";

assert.equal(usableSubjectPhrase("North Ed to purchase new"), false);
assert.equal(usableSubjectPhrase("1-year-old Acme boy faces"), false);
assert.equal(usableSubjectPhrase("office looking"), false);
assert.equal(usableSubjectPhrase("North Ed to purchase"), false);
// Complete object / full event name still OK.
assert.equal(usableSubjectPhrase("North Ed new buses"), true);
assert.equal(usableSubjectPhrase("North Ed to purchase new buses"), true);
assert.equal(usableSubjectPhrase("Acme toddler hospitalized"), true);
assert.equal(usableSubjectPhrase("One-Year-Old Hospitalized"), true);
assert.equal(usableSubjectPhrase("Decrease in Parking Rates"), true);

const thursdayStumps: EmailEditionSnapshot = {
  date: "2026-09-03",
  captured_at: "2026-09-03T12:00:00.000Z",
  lead: null,
  around: [
    {
      title: "North Ed to purchase new buses for student transportation",
      dek: "",
      url: "https://www.traverseticker.com/news/north-ed-buses/",
      sources: ["The Ticker"],
    },
    {
      title:
        "1-year-old Acme boy faces life-threatening injuries after falling into pond",
      dek: "",
      url: "https://www.9and10news.com/2026/09/02/acme-toddler-pond/",
      sources: ["9&10 News"],
    },
    {
      title: "One-Year-Old Hospitalized After Falling Into Pond in Acme",
      dek: "",
      url: "https://www.record-eagle.com/acme-toddler-hospitalized",
      sources: ["Record-Eagle"],
      paywalled: true,
    },
  ],
  alerts: [],
  tonight: [],
  civic: [],
  sports: [],
};

const thursday = buildMorningLetterSubject(thursdayStumps);
assert.notEqual(thursday, THURSDAY_BROKEN);
assert.doesNotMatch(thursday, /to purchase new ·|to purchase new$/i);
assert.doesNotMatch(thursday, /boy faces ·|boy faces$/i);
assert.ok(
  !/purchase new\b/i.test(thursday) || /purchase new buses/i.test(thursday),
  `must not end a phrase on bare "new": ${thursday}`,
);
assert.ok(
  !/\bboy faces\b/i.test(thursday) ||
    /\bboy faces \S+/i.test(thursday.replace(/^🗞️\s*/, "")),
  `must not end a phrase on dangling "faces": ${thursday}`,
);
// Same pond / toddler story must appear at most once.
const thursdayBody = thursday.replace(/^🗞️\s*/, "");
const toddlerHits = thursdayBody
  .split(" · ")
  .filter((p) =>
    /1[- ]?year[- ]?old|one[- ]?year[- ]?old|toddler|hospitaliz|acme.*pond|pond.*acme/i.test(
      p,
    ),
  );
assert.ok(
  toddlerHits.length <= 1,
  `toddler/pond story must not duplicate in subject: ${thursday}`,
);
assert.match(thursday, /North Ed new buses/i);
assert.ok(
  /Acme toddler hospitalized/i.test(thursday),
  `expected one complete toddler phrase, got: ${thursday}`,
);

// Prefer 3 complete phrases when real-shaped titles all parse under the cap.
const thursdayCompleteThree: EmailEditionSnapshot = {
  date: "2026-09-03",
  captured_at: "2026-09-03T12:00:00.000Z",
  lead: null,
  around: [
    {
      title: "North Ed to purchase new buses for student transportation",
      dek: "",
      url: "https://www.traverseticker.com/news/north-ed-buses/",
      sources: ["The Ticker"],
    },
    {
      title:
        "1-year-old Acme boy faces life-threatening injuries after falling into pond",
      dek: "",
      url: "https://www.9and10news.com/2026/09/02/acme-toddler-pond/",
      sources: ["9&10 News"],
    },
    {
      title: "One-Year-Old Hospitalized After Falling Into Pond in Acme",
      dek: "",
      url: "https://www.record-eagle.com/acme-toddler-hospitalized",
      sources: ["Record-Eagle"],
      paywalled: true,
    },
    {
      title: "Decrease in Parking Rates Coming After Labor Day",
      dek: "",
      url: "https://www.traverseticker.com/news/parking-rates/",
      sources: ["The Ticker"],
    },
    {
      title:
        "Bat found in local home tests positive for rabies; health department warns community",
      dek: "",
      url: "https://www.facebook.com/TraverseCityTicker/posts/rabies",
      sources: ["Ticker (Facebook)"],
    },
  ],
  alerts: [],
  tonight: [],
  civic: [],
  sports: [],
};

const thursdayThree = buildMorningLetterSubject(thursdayCompleteThree);
assert.doesNotMatch(thursdayThree, /to purchase new ·|boy faces ·/i);
assert.equal(
  thursdayThree.split(" · ").length,
  3,
  `prefer three complete phrases when they parse: ${thursdayThree}`,
);
assert.match(thursdayThree, /North Ed new buses/i);
assert.match(thursdayThree, /Decrease in Parking Rates|Bat tests positive for rabies|Acme toddler hospitalized/i);
const thursdayThreeToddler = thursdayThree
  .replace(/^🗞️\s*/, "")
  .split(" · ")
  .filter((p) =>
    /1[- ]?year[- ]?old|one[- ]?year[- ]?old|toddler|hospitaliz|acme|pond/i.test(
      p,
    ),
  );
assert.ok(
  thursdayThreeToddler.length <= 1,
  `still only one toddler phrase among three: ${thursdayThree}`,
);
const thursdayThreeLen = thursdayThree.replace(/^🗞️\s*/, "").length;
assert.ok(
  thursdayThreeLen <= 84,
  `thursday three phrase length ${thursdayThreeLen} must be ≤84`,
);

console.log(
  `dry-run-letter-subject: ok\n  subject=${subject}\n  phraseLen=${phraseLen}\n  aug31=${aug31}\n  brokenOnly=${brokenSubject}\n  secondPreview=${secondPreview}\n  recut=${recutSubject}\n  sept1=${sept1}\n  deputyOnly=${deputySubject}\n  allCaps=${allCapsSubject}\n  thursday=${thursday}\n  thursdayThree=${thursdayThree}`,
);
