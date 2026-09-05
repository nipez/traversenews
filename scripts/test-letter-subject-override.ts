/**
 * Desk subject override: explicit string wins; empty/whitespace falls back.
 * Phrase length: leading 🗞️ not counted; soft 80 / hard 84.
 *
 *   npm run test:letter-subject-override
 */
import assert from "node:assert/strict";
import {
  buildMorningLetter,
  buildMorningLetterSubject,
  resolveMorningLetterSubject,
} from "../src/lib/email-letter";
import { buildEmailEditionSnapshot } from "../src/lib/email-editions";
import {
  SUBJECT_PHRASE_HARD_MAX,
  SUBJECT_PHRASE_SOFT_CAP,
  isMorningLetterSubjectOverMax,
  isMorningLetterSubjectOverSoftCap,
  morningLetterSubjectPhraseLen,
} from "../src/lib/email-subject-length";
import type { AppData, EmailEditionSnapshot } from "../src/lib/types";

const base: EmailEditionSnapshot = {
  date: "2026-09-05",
  captured_at: "2026-09-05T12:00:00.000Z",
  lead: {
    title: "Grand Traverse tourist tax ask heads to Lansing",
    dek: "County board",
    url: "https://example.com/tax",
    sources: [],
    desk_original: false,
  },
  around: [
    {
      title: "Hannah Avenue closed for water main work",
      dek: "Detour",
      url: "https://example.com/hannah",
      sources: ["TC Record-Eagle"],
    },
    {
      title: "Garfield Township reports two weekend arrests",
      dek: "Sheriff",
      url: "https://example.com/arrests",
      sources: ["9&10 News"],
    },
  ],
  alerts: [
    {
      title: "Rabies alert for stray bat in Acme",
      dek: "Health",
      url: "https://example.com/rabies",
      source_name: "Health Dept",
    },
  ],
  tonight: [],
  civic: [],
  sports: [],
};

const auto = buildMorningLetterSubject(base);
assert.ok(auto.startsWith("🗞️"), "auto subject keeps emoji pack");
assert.notEqual(auto.length, 0, "auto subject is non-empty");

const locked =
  "🗞️ GT tourist tax ask · Hannah Avenue detour · Garfield Twp. arrests";

const withOverride: EmailEditionSnapshot = {
  ...base,
  subject_override: locked,
};
assert.equal(
  resolveMorningLetterSubject(withOverride),
  locked,
  "override wins over builder",
);
assert.equal(
  buildMorningLetter(withOverride).subject,
  locked,
  "buildMorningLetter uses override as Resend subject",
);
assert.notEqual(
  locked,
  auto,
  "fixture override differs from auto (otherwise test is weak)",
);

const emptyOverride: EmailEditionSnapshot = {
  ...base,
  subject_override: "   ",
};
assert.equal(
  resolveMorningLetterSubject(emptyOverride),
  auto,
  "whitespace override falls back to builder",
);

const nullOverride: EmailEditionSnapshot = {
  ...base,
  subject_override: null,
};
assert.equal(
  resolveMorningLetterSubject(nullOverride),
  auto,
  "null override falls back to builder",
);

const missingOverride: EmailEditionSnapshot = { ...base };
assert.equal(
  resolveMorningLetterSubject(missingOverride),
  auto,
  "missing override falls back to builder",
);

const emptyApp = {
  stories: [],
  events: [],
  sources: [],
  athletics: [],
  schools: [],
  shows: [],
  editions: [],
  email_editions: [],
  drafts: [],
  subscribers: [],
  unsubscribed: [],
  tips: [],
  event_tips: [],
  last_pull_at: null,
  section_headers: {},
} as unknown as AppData;

const preserved = buildEmailEditionSnapshot(emptyApp, new Date("2026-09-05T16:00:00.000Z"), {
  subject_override: locked,
});
assert.equal(
  preserved.subject_override,
  locked,
  "snapshot builder can carry Desk override through rebuild",
);
assert.equal(
  buildEmailEditionSnapshot(emptyApp, new Date("2026-09-05T16:00:00.000Z"), {
    subject_override: "  ",
  }).subject_override,
  null,
  "blank override is stored as null on rebuild",
);

// Length: emoji pack not counted
assert.equal(
  morningLetterSubjectPhraseLen("🗞️ abc"),
  3,
  "strips leading newspaper emoji + space",
);
assert.equal(
  morningLetterSubjectPhraseLen(locked),
  locked.replace(/^🗞️\s*/, "").length,
  "locked fixture uses phrase-body length",
);
assert.ok(
  morningLetterSubjectPhraseLen(locked) <= SUBJECT_PHRASE_HARD_MAX,
  "Nick’s 3-pack fixture fits under hard max",
);
assert.equal(SUBJECT_PHRASE_SOFT_CAP, 80);
assert.equal(SUBJECT_PHRASE_HARD_MAX, 84);

const softBody = "x".repeat(SUBJECT_PHRASE_SOFT_CAP + 1);
assert.equal(
  isMorningLetterSubjectOverSoftCap(`🗞️ ${softBody}`),
  true,
  "81 phrase chars is over soft cap",
);
assert.equal(
  isMorningLetterSubjectOverMax(`🗞️ ${softBody}`),
  false,
  "81 is still under hard max",
);

const hardBody = "x".repeat(SUBJECT_PHRASE_HARD_MAX);
assert.equal(
  isMorningLetterSubjectOverMax(`🗞️ ${hardBody}`),
  false,
  "exactly 84 is allowed",
);
assert.equal(
  isMorningLetterSubjectOverMax(`🗞️ ${hardBody}!`),
  true,
  "85 phrase chars is over hard max — API/Save must refuse",
);

console.log("ok — subject override wins; empty falls back; length caps ok");
