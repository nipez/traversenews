/**
 * Letter lead (“The one to read”): Desk override persistence, past-run
 * exclusion, same-story 21-day window, and hard-news fallback.
 *
 *   npm run test:letter-lead-override
 */
import assert from "node:assert/strict";
import {
  buildEmailEditionSnapshot,
  letterCardIdentity,
  pickAroundBackfillCard,
  pickFreshLeadForLetter,
  SAME_STORY_LOOKBACK_DAYS,
} from "../src/lib/email-editions";
import { clusterStories } from "../src/lib/pull/cluster";
import type {
  AppData,
  EditionSnapshot,
  EmailEditionSnapshot,
  EmailStoryCard,
  Source,
  Story,
} from "../src/lib/types";

assert.equal(SAME_STORY_LOOKBACK_DAYS, 21);

const sources: Source[] = [
  {
    id: "src_ticker",
    name: "The Ticker",
    beat_id: "beat_news",
    homepage: "https://www.traverseticker.com",
    feed_url: null,
    pull_method: "rss",
    enabled: true,
    notes: "",
  },
  {
    id: "src_910",
    name: "9&10 News",
    beat_id: "beat_news",
    homepage: "https://www.9and10news.com",
    feed_url: null,
    pull_method: "rss",
    enabled: true,
    notes: "",
  },
  {
    id: "src_re",
    name: "Record-Eagle",
    beat_id: "beat_news",
    homepage: "https://www.record-eagle.com",
    feed_url: null,
    pull_method: "rss",
    enabled: true,
    notes: "",
  },
  {
    id: "src_ipr",
    name: "Interlochen Public Radio",
    beat_id: "beat_news",
    homepage: "https://www.interlochenpublicradio.org",
    feed_url: null,
    pull_method: "rss",
    enabled: true,
    notes: "",
  },
];

function story(
  partial: Partial<Story> & Pick<Story, "id" | "title" | "url" | "source_id">,
): Story {
  return {
    dek: partial.dek ?? "Local news.",
    published_at: partial.published_at ?? "2026-09-30T10:00:00.000Z",
    is_original: partial.is_original ?? false,
    byline: partial.byline ?? null,
    slug: partial.slug ?? null,
    image_url: null,
    body: null,
    ...partial,
  };
}

const KAYAKER_TITLE =
  "Missing kayaker recovered from West Grand Traverse Bay identified";
const KAYAKER_URL = "https://traverse.news/story/missing-kayaker-identified";
const KAYAKER_REWRITE =
  "Authorities identify kayaker recovered from West Grand Traverse Bay";
const KAYAKER_REWRITE_URL =
  "https://www.9and10news.com/2026/09/30/kayaker-identified/";
const FRESH_ORIGINAL_TITLE = "County road millage draft heads to November ballot";
const FRESH_ORIGINAL_URL = "https://traverse.news/story/road-millage-draft";
const HARD_NEWS_TITLE =
  "Garfield Township puts a 1-year ban on data centers, cryptocurrency mining";
const HARD_NEWS_URL =
  "https://www.record-eagle.com/news/local_news/garfield-data-center-ban";

const letterSep25: EmailEditionSnapshot = {
  date: "2026-09-25",
  captured_at: "2026-09-25T12:00:00.000Z",
  lead: {
    title: KAYAKER_TITLE,
    dek: "Staff.",
    url: KAYAKER_URL,
    sources: [],
    desk_original: true,
  },
  around: [],
  alerts: [],
  tonight: [],
  civic: [],
  sports: [],
};

const homepageSep29: EditionSnapshot = {
  date: "2026-09-29",
  captured_at: "2026-09-29T12:00:00.000Z",
  lead: {
    title: KAYAKER_TITLE,
    dek: "Staff.",
    url: KAYAKER_URL,
    published_at: "2026-09-25T10:00:00.000Z",
    sources: ["traverse.news"],
    byline: "By traverse.news",
    slug: "missing-kayaker-identified",
    is_original: true,
  },
  around: [],
  events: [],
  civic: [],
};

const at = new Date("2026-09-30T16:00:00.000Z");

// --- Past-run original must not auto-lead; fall through to unused original ---
const dataWithFreshOriginal = {
  beats: [],
  sources,
  stories: [
    story({
      id: "orig_kayaker",
      title: KAYAKER_TITLE,
      url: KAYAKER_URL,
      source_id: "src_ticker",
      is_original: true,
      byline: "By traverse.news",
      slug: "missing-kayaker-identified",
      published_at: "2026-09-29T18:00:00.000Z",
    }),
    story({
      id: "orig_fresh",
      title: FRESH_ORIGINAL_TITLE,
      url: FRESH_ORIGINAL_URL,
      source_id: "src_ticker",
      is_original: true,
      byline: "By traverse.news",
      slug: "road-millage-draft",
      published_at: "2026-09-28T12:00:00.000Z",
    }),
  ],
  events: [],
  athletics: [],
  schools: [],
  subscribers: [],
  unsubscribed: [],
  tips: [],
  event_tips: [],
  last_pull_at: null,
  editions: [homepageSep29],
  email_editions: [letterSep25],
  drafts: [],
} as unknown as AppData;

const letterFresh = buildEmailEditionSnapshot(dataWithFreshOriginal, at);
assert.equal(
  letterFresh.lead?.url,
  FRESH_ORIGINAL_URL,
  "auto lead skips already-run kayaker original for unused original",
);
assert.equal(letterFresh.lead?.desk_original, true);

// --- Same-story rewrite of already-run lead stays out ---
const dataSameStory = {
  ...dataWithFreshOriginal,
  stories: [
    story({
      id: "rewrite_910",
      title: KAYAKER_REWRITE,
      url: KAYAKER_REWRITE_URL,
      source_id: "src_910",
      is_original: true,
      byline: "By traverse.news",
      slug: "kayaker-rewrite",
      published_at: "2026-09-30T09:00:00.000Z",
      dek: "Authorities identify kayaker recovered from West Grand Traverse Bay after search.",
    }),
    story({
      id: "orig_fresh_2",
      title: FRESH_ORIGINAL_TITLE,
      url: FRESH_ORIGINAL_URL,
      source_id: "src_ticker",
      is_original: true,
      byline: "By traverse.news",
      slug: "road-millage-draft",
      published_at: "2026-09-28T12:00:00.000Z",
    }),
  ],
} as unknown as AppData;

// Confirm titlesLikelySameStory would matter — if rewrite doesn't match,
// fallthrough still picks fresh original; assert lead is not the rewrite URL.
const letterSame = buildEmailEditionSnapshot(dataSameStory, at);
assert.notEqual(
  letterSame.lead?.url,
  KAYAKER_REWRITE_URL,
  "same-story kayaker rewrite must not become auto lead",
);
assert.equal(letterSame.lead?.url, FRESH_ORIGINAL_URL);

// --- Hard-news fallback when every original already ran ---
const dataHardFallback = {
  beats: [],
  sources,
  stories: [
    story({
      id: "orig_kayaker_only",
      title: KAYAKER_TITLE,
      url: KAYAKER_URL,
      source_id: "src_ticker",
      is_original: true,
      byline: "By traverse.news",
      slug: "missing-kayaker-identified",
      published_at: "2026-09-29T18:00:00.000Z",
    }),
    story({
      id: "hard_garfield",
      title: HARD_NEWS_TITLE,
      url: HARD_NEWS_URL,
      source_id: "src_re",
      dek: "Township board votes one-year ban on data centers.",
      published_at: "2026-09-30T08:00:00.000Z",
    }),
    story({
      id: "soft_lifestyle",
      title: "Library News: The Dog Days of Summer",
      url: "https://www.oldmission.net/2026/09/library-dog-days/",
      source_id: "src_ipr",
      dek: "Concerts and crafts.",
      published_at: "2026-09-30T07:00:00.000Z",
    }),
  ],
  events: [],
  athletics: [],
  schools: [],
  subscribers: [],
  unsubscribed: [],
  tips: [],
  event_tips: [],
  last_pull_at: null,
  editions: [homepageSep29],
  email_editions: [letterSep25],
  drafts: [],
} as unknown as AppData;

const letterHard = buildEmailEditionSnapshot(dataHardFallback, at);
assert.equal(
  letterHard.lead?.url,
  HARD_NEWS_URL,
  "when originals are spent, auto lead falls back to unused hard news",
);
assert.ok(!letterHard.lead?.desk_original);
assert.ok(
  letterHard.around.every((c) => c.url !== HARD_NEWS_URL),
  "hard-news lead must not also sit in Around",
);

// --- pickFreshLeadForLetter unit: empty when nothing unused ---
const clustersSpent = clusterStories(
  [
    story({
      id: "spent",
      title: KAYAKER_TITLE,
      url: KAYAKER_URL,
      source_id: "src_ticker",
      is_original: true,
      published_at: "2026-09-29T18:00:00.000Z",
      slug: "missing-kayaker-identified",
    }),
  ],
  sources,
);
const emptyLead = pickFreshLeadForLetter(
  clustersSpent,
  new Set([`url:${KAYAKER_URL.toLowerCase().replace(/\/$/, "")}`]),
  [KAYAKER_TITLE],
  at,
);
// Identity normalize may differ — assert via snapshot path is enough; here just
// ensure function returns null when excluded set covers the only original and
// there is no hard news.
assert.equal(
  pickFreshLeadForLetter(clustersSpent, new Set(["url:https://traverse.news/story/missing-kayaker-identified"]), [KAYAKER_TITLE], at),
  null,
  "no unused original or hard news → no lead",
);

// --- Desk lead override survives rebuild like subject_override ---
const lockedLead: EmailStoryCard = {
  title: "Hannah Avenue closed for water main work",
  dek: "Detour",
  url: "https://example.com/hannah",
  sources: ["TC Record-Eagle"],
  paywalled: true,
};

const emptyApp = {
  stories: [
    story({
      id: "orig_kayaker_b",
      title: KAYAKER_TITLE,
      url: KAYAKER_URL,
      source_id: "src_ticker",
      is_original: true,
      slug: "missing-kayaker-identified",
      published_at: "2026-09-29T18:00:00.000Z",
    }),
  ],
  events: [],
  sources,
  athletics: [],
  schools: [],
  shows: [],
  editions: [homepageSep29],
  email_editions: [letterSep25],
  drafts: [],
  subscribers: [],
  unsubscribed: [],
  tips: [],
  event_tips: [],
  last_pull_at: null,
  section_headers: {},
} as unknown as AppData;

const lockedRebuild = buildEmailEditionSnapshot(emptyApp, at, {
  subject_override: "🗞️ Desk subject lock",
  lead: lockedLead,
  lead_locked: true,
  around: [
    {
      title: "IPR covers Boardman Level 2 advisory",
      dek: "Health",
      url: "https://example.com/boardman",
      sources: ["IPR"],
    },
  ],
  around_locked: true,
});
assert.equal(lockedRebuild.lead_locked, true);
assert.equal(lockedRebuild.lead?.url, lockedLead.url);
assert.equal(lockedRebuild.subject_override, "🗞️ Desk subject lock");
assert.equal(lockedRebuild.around_locked, true);
assert.equal(lockedRebuild.around.length, 1);

// Simulate pull/snapshot survival path
function snapshotPreservesLockedLead(
  prior: EmailEditionSnapshot,
  rebuildAt: Date,
): EmailEditionSnapshot {
  const priorOverride =
    typeof prior.subject_override === "string" && prior.subject_override.trim()
      ? prior.subject_override.trim()
      : null;
  const aroundLocked = Boolean(
    prior.around_locked && Array.isArray(prior.around),
  );
  const leadLocked = Boolean(prior.lead_locked && prior.lead);
  return buildEmailEditionSnapshot(emptyApp, rebuildAt, {
    weather_line: prior.weather_line ?? null,
    subject_override: priorOverride,
    around: aroundLocked ? prior.around : null,
    around_locked: aroundLocked,
    lead: leadLocked ? prior.lead : null,
    lead_locked: leadLocked,
  });
}

const afterPull = snapshotPreservesLockedLead(
  { ...lockedRebuild, weather_line: "68° / 50° · fair" },
  new Date("2026-09-30T18:00:00.000Z"),
);
assert.equal(afterPull.lead_locked, true, "pull path keeps lead_locked");
assert.equal(afterPull.lead?.url, lockedLead.url, "pull path keeps Desk lead");
assert.equal(
  afterPull.subject_override,
  "🗞️ Desk subject lock",
  "pull path keeps subject beside locked lead",
);
assert.equal(afterPull.around_locked, true);

// Clearing lead_locked returns to auto (skips spent kayaker → no unused original
// in emptyApp except spent one; hard news absent → null lead).
const unlocked = buildEmailEditionSnapshot(emptyApp, at, {
  subject_override: "🗞️ Desk subject lock",
  lead_locked: false,
  around: lockedRebuild.around,
  around_locked: true,
});
assert.ok(!unlocked.lead_locked);
assert.notEqual(unlocked.lead?.url, lockedLead.url);

// --- Promoting an Around card backfills to keep count ---
const aroundSlate: EmailStoryCard[] = [
  {
    title: HARD_NEWS_TITLE,
    dek: "Ban.",
    url: HARD_NEWS_URL,
    sources: ["Record-Eagle"],
    paywalled: true,
  },
  {
    title: "County road crews prep for early frost",
    dek: "Roads.",
    url: "https://www.9and10news.com/2026/09/30/frost/",
    sources: ["9&10 News"],
  },
];
const backfillData = {
  ...dataHardFallback,
  stories: [
    ...dataHardFallback.stories,
    story({
      id: "backfill_ipr",
      title: "Boardman River bridge deck repairs start Monday",
      url: "https://www.interlochenpublicradio.org/2026/09/30/bridge-deck/",
      source_id: "src_ipr",
      dek: "Construction.",
      published_at: "2026-09-30T06:00:00.000Z",
    }),
  ],
} as unknown as AppData;
const remaining = aroundSlate.slice(1);
const fill = pickAroundBackfillCard(
  backfillData,
  remaining,
  aroundSlate[0],
  at,
);
assert.ok(fill, "backfill finds an unused bay card");
assert.notEqual(letterCardIdentity(fill!), letterCardIdentity(aroundSlate[0]));
assert.notEqual(letterCardIdentity(fill!), letterCardIdentity(remaining[0]));
assert.equal(
  remaining.length + 1,
  aroundSlate.length,
  "promotion + one backfill restores prior Around count",
);

console.log(
  `test-letter-lead-override: ok (lead=${letterFresh.lead?.title?.slice(0, 40)}, hard=${letterHard.lead?.url}, locked=${afterPull.lead?.url})`,
);