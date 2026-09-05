/**
 * Desk subject override: explicit string wins; empty/whitespace falls back.
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

console.log("ok — subject override wins; empty falls back");
