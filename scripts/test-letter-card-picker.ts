/**
 * Desk letter card picker: past-edition flags + subject_override survival.
 *
 *   npm run test:letter-card-picker
 */
import assert from "node:assert/strict";
import {
  cardMatchesPrior,
  deskLetterMixHint,
  findPastEditionAppearances,
  formatPastRunFlag,
  normalizeDeskAroundSelection,
} from "../src/lib/desk-letter-cards";
import { buildEmailEditionSnapshot } from "../src/lib/email-editions";
import { resolveMorningLetterSubject } from "../src/lib/email-letter";
import type {
  AppData,
  EditionSnapshot,
  EmailEditionSnapshot,
  EmailStoryCard,
} from "../src/lib/types";

const lockedSubject =
  "🗞️ Center Road crash · Toddler rescued from pond · GT tax ask";

const priorLetter: EmailEditionSnapshot = {
  date: "2026-09-03",
  captured_at: "2026-09-03T12:00:00.000Z",
  lead: null,
  around: [
    {
      title: "Toddler pulled from Acme pond, hospitalized",
      dek: "Sheriff",
      url: "https://example.com/toddler-pond",
      sources: ["9&10 News"],
    },
    {
      title: "Center Road closed after two-vehicle crash",
      dek: "MSP",
      url: "https://example.com/center-road",
      sources: ["TC Record-Eagle"],
      paywalled: true,
    },
  ],
  alerts: [],
  tonight: [],
  civic: [],
  sports: [],
};

const priorHomepage: EditionSnapshot = {
  date: "2026-08-31",
  captured_at: "2026-08-31T12:00:00.000Z",
  lead: null,
  around: [
    {
      title: "Garfield Township reports two weekend arrests",
      dek: "Sheriff",
      url: "https://example.com/arrests",
      published_at: "2026-08-31T10:00:00.000Z",
      sources: ["9&10 News"],
      byline: null,
      slug: null,
      is_original: false,
    },
  ],
  events: [],
  civic: [],
};

// Same URL → match
assert.equal(
  cardMatchesPrior(
    { title: "Different rewrite", url: "https://example.com/toddler-pond" },
    priorLetter.around[0],
  ),
  true,
  "URL identity matches across rewrites",
);

// Same-story title overlap (Center Road) without shared URL
assert.equal(
  cardMatchesPrior(
    {
      title: "Two hurt in Center Road crash near Acme",
      url: "https://other.example/center-crash",
    },
    priorLetter.around[1],
  ),
  true,
  "Center Road token overlap matches same story",
);

// Toddler / pond rewrite
assert.equal(
  cardMatchesPrior(
    {
      title: "Acme toddler rescued after falling into pond",
      url: "https://ticker.example/pond-rescue",
    },
    priorLetter.around[0],
  ),
  true,
  "toddler/pond rewrite matches prior letter card",
);

const runs = findPastEditionAppearances(
  {
    title: "Acme toddler rescued after falling into pond",
    url: "https://ticker.example/pond-rescue",
  },
  {
    email_editions: [priorLetter],
    editions: [priorHomepage],
    today: "2026-09-05",
  },
);
assert.ok(
  runs.some((r) => r.date === "2026-09-03" && r.kind === "letter"),
  "flags Sep 3 letter appearance",
);
assert.match(
  formatPastRunFlag({ date: "2026-09-03", kind: "letter" }),
  /ran Sep 3 letter/,
  "human flag label",
);

const homepageRuns = findPastEditionAppearances(
  {
    title: "Garfield Twp. weekend arrests reported",
    url: "https://other.example/garfield-arrests",
  },
  {
    email_editions: [priorLetter],
    editions: [priorHomepage],
    today: "2026-09-05",
  },
);
assert.ok(
  homepageRuns.some((r) => r.date === "2026-08-31" && r.kind === "homepage"),
  "flags Aug 31 homepage appearance via rewrite",
);

const nineHeavy: EmailStoryCard[] = [
  {
    title: "A",
    dek: "",
    url: "https://example.com/a",
    sources: ["9&10 News"],
  },
  {
    title: "B",
    dek: "",
    url: "https://example.com/b",
    sources: ["9&10 News"],
  },
  {
    title: "C",
    dek: "",
    url: "https://example.com/c",
    sources: ["9&10 News"],
  },
  {
    title: "D",
    dek: "",
    url: "https://example.com/d",
    sources: ["IPR"],
  },
];
const nineHint = deskLetterMixHint(nineHeavy);
assert.ok(nineHint, "9&10-heavy slate gets a mix hint");
assert.match(nineHint!.message, /9&10/, "hint names 9&10");

const eyesHeavy: EmailStoryCard[] = [
  {
    title: "E1",
    dek: "",
    url: "https://example.com/e1",
    sources: ["The Ticker"],
  },
  {
    title: "E2",
    dek: "",
    url: "https://example.com/e2",
    sources: ["Northern Express"],
  },
  {
    title: "E3",
    dek: "",
    url: "https://example.com/e3",
    sources: ["TC Business News"],
  },
];
const eyesHint = deskLetterMixHint(eyesHeavy);
assert.ok(eyesHint, "Eyes Only-heavy slate gets a mix hint");
assert.match(eyesHint!.message, /Eyes Only/, "hint names Eyes Only");

const parsed = normalizeDeskAroundSelection([
  {
    title: "Hannah Avenue closed for water main work",
    dek: "Detour",
    url: "https://example.com/hannah",
    sources: ["TC Record-Eagle"],
    paywalled: true,
  },
  {
    title: "Garfield Township reports two weekend arrests",
    dek: "Sheriff",
    url: "https://example.com/arrests",
    sources: ["9&10 News"],
  },
]);
assert.equal(parsed.ok, true);
if (parsed.ok) {
  assert.equal(parsed.around.length, 2);
}

const tooMany = normalizeDeskAroundSelection(
  Array.from({ length: 7 }, (_, i) => ({
    title: `Story ${i}`,
    dek: "",
    url: `https://example.com/${i}`,
    sources: ["IPR"],
  })),
);
assert.equal(tooMany.ok, false, "rejects more than 6 cards");

// Saving a Desk Around slate must not wipe subject_override on rebuild path.
const emptyApp = {
  stories: [],
  events: [],
  sources: [],
  athletics: [],
  schools: [],
  shows: [],
  editions: [],
  email_editions: [priorLetter],
  drafts: [],
  subscribers: [],
  unsubscribed: [],
  tips: [],
  event_tips: [],
  last_pull_at: null,
  section_headers: {},
} as unknown as AppData;

const deskAround: EmailStoryCard[] = [
  {
    title: "Hannah Avenue closed for water main work",
    dek: "Detour",
    url: "https://example.com/hannah",
    sources: ["TC Record-Eagle"],
    paywalled: true,
  },
  {
    title: "IPR covers Boardman Level 2 advisory",
    dek: "Health",
    url: "https://example.com/boardman",
    sources: ["IPR"],
  },
];

const lockedRebuild = buildEmailEditionSnapshot(
  emptyApp,
  new Date("2026-09-05T16:00:00.000Z"),
  {
    subject_override: lockedSubject,
    around: deskAround,
    around_locked: true,
  },
);
assert.equal(
  lockedRebuild.subject_override,
  lockedSubject,
  "locked around rebuild keeps subject_override",
);
assert.equal(lockedRebuild.around_locked, true, "around_locked flag set");
assert.equal(lockedRebuild.around.length, 2, "Desk around preserved");
assert.equal(
  lockedRebuild.around[0].url,
  "https://example.com/hannah",
  "Desk card order preserved",
);
assert.equal(
  resolveMorningLetterSubject(lockedRebuild),
  lockedSubject,
  "subject resolve still uses override after card lock",
);

const unlocked = buildEmailEditionSnapshot(
  emptyApp,
  new Date("2026-09-05T16:00:00.000Z"),
  {
    subject_override: lockedSubject,
    around_locked: false,
  },
);
assert.equal(
  unlocked.subject_override,
  lockedSubject,
  "auto rebuild still keeps subject_override",
);
assert.ok(!unlocked.around_locked, "unlocked rebuild clears around_locked");

console.log("ok — past-edition flags + subject_override survives card lock");
