/**
 * Dry-run: Saturday morning letter prefers unused hard news (3 IPR + RE)
 * over lifestyle fillers; subject uses parseable news phrases ≤84.
 *
 *   npx tsx scripts/dry-run-letter-hard-news.ts
 */
import assert from "node:assert/strict";
import {
  isEyesOnlyCluster,
  isLifestyleJunk,
  looksLikeHardNews,
  selectAroundTheBay,
} from "../src/lib/around";
import {
  buildEmailEditionSnapshot,
  LETTER_AROUND_MAX,
} from "../src/lib/email-editions";
import { buildMorningLetterSubject } from "../src/lib/email-letter";
import type { AppData, ClusteredStory, Source, Story } from "../src/lib/types";

const saturday = new Date("2026-08-29T15:00:00.000Z");

assert.equal(
  isLifestyleJunk({
    title: "Library News: The Dog Days of Summer",
    dek: "Concerts and crafts.",
    url: "https://www.oldmission.net/2026/08/library-dog-days-summer/",
  }),
  true,
);
assert.equal(
  isLifestyleJunk({
    title: "Steve Kershner added to Michigan Ski Hall of Fame",
    url: "https://antrimreview.net/content/steve-kershner-added-michigan-ski-hall-fame",
  }),
  true,
);
assert.equal(
  isLifestyleJunk({
    title:
      "Ready, Set, Locals Summer! Tourist hot spots become local haunts once more",
    url: "https://northernexpress.com/news/feature/ready-set-locals-summer/",
  }),
  true,
);
assert.equal(
  isLifestyleJunk({
    title: "Old Neighborhood on the North Shore",
    dek: "Glen Eyrie going strong for a century and more",
    url: "https://betsiecurrent.com/old-neighborhood-on-north-shore-glen-eyrie/",
  }),
  true,
);
assert.equal(
  isLifestyleJunk({
    title: "Cedar Polka Fest dances August away",
    url: "https://glenarborsun.com/cedar-polka-fest-dances-august-away/",
  }),
  false,
  "Polka Fest stays eligible for the letter body",
);

assert.equal(
  looksLikeHardNews({
    title:
      "Garfield Township puts a 1-year ban on data centers, cryptocurrency mining",
  }),
  true,
);
assert.equal(
  looksLikeHardNews({
    title:
      "Work in Leelanau Co. but can't afford to live there? Housing advocates want to hear from you",
  }),
  true,
);

function src(
  id: string,
  name: string,
  homepage: string,
): Source {
  return {
    id,
    name,
    beat_id: "beat_news",
    homepage,
    feed_url: null,
    pull_method: "rss",
    enabled: true,
    notes: "",
  };
}

const sources: Source[] = [
  src("src_ipr", "IPR News", "https://www.interlochenpublicradio.org"),
  src("src_glenarbor_sun", "Glen Arbor Sun", "https://glenarborsun.com"),
  src("src_re", "Record-Eagle", "https://www.record-eagle.com"),
  src("src_ticker", "The Ticker", "https://www.traverseticker.com"),
  src("src_omp_gazette", "Old Mission Gazette", "https://www.oldmission.net"),
  src("src_betsie", "The Betsie Current", "https://betsiecurrent.com"),
  src("src_antrim_review", "Antrim Review", "https://antrimreview.net"),
  src("src_northern", "Northern Express", "https://www.northernexpress.com"),
  src("src_910", "9&10 News", "https://www.9and10news.com"),
];

function story(input: {
  id: string;
  title: string;
  url: string;
  source_id: string;
  published_at: string;
  dek?: string;
}): Story {
  return {
    id: input.id,
    title: input.title,
    dek: input.dek ?? "",
    url: input.url,
    source_id: input.source_id,
    published_at: input.published_at,
    is_original: false,
    body: null,
    image_url: null,
    byline: null,
    slug: null,
  };
}

const stories: Story[] = [
  story({
    id: "polka",
    title: "Cedar Polka Fest dances August away",
    url: "https://glenarborsun.com/cedar-polka-fest-dances-august-away/",
    source_id: "src_glenarbor_sun",
    published_at: "2026-08-28T12:00:00.000Z",
  }),
  story({
    id: "garfield",
    title:
      "Garfield Township puts a 1-year ban on data centers, cryptocurrency mining",
    url: "https://www.interlochenpublicradio.org/2026-08-26/garfield-township-puts-a-1-year-ban-on-data-centers-cryptocurrency-mining",
    source_id: "src_ipr",
    published_at: "2026-08-26T16:00:00.000Z",
  }),
  story({
    id: "leelanau",
    title:
      "Work in Leelanau Co. but can't afford to live there? Housing advocates want to hear from you",
    url: "https://www.interlochenpublicradio.org/2026-08-24/work-in-leelanau-co-but-cant-afford-to-live-there-housing-advocates-want-to-hear-from-you",
    source_id: "src_ipr",
    published_at: "2026-08-24T16:00:00.000Z",
  }),
  story({
    id: "fema",
    title:
      "Northern Michigan residents receive millions in FEMA aid for April flooding",
    url: "https://www.interlochenpublicradio.org/ipr-news/2026-08-17/northern-michigan-residents-receive-millions-in-fema-aid-for-april-flooding",
    source_id: "src_ipr",
    published_at: "2026-08-17T16:00:00.000Z",
  }),
  story({
    id: "treasurer",
    title:
      "Grand Traverse County Board seeks treasurer's report — under oath — Sept. 2",
    url: "https://www.record-eagle.com/news/local_news/grand-traverse-county-board-seeks-treasurer-s-report---under-oath---sept/article_e2bd5bb9-82bf-453b-8c60-ade66ff8abc2.html",
    source_id: "src_re",
    published_at: "2026-08-27T16:00:00.000Z",
  }),
  story({
    id: "parking",
    title: "Decrease in Parking Rates Coming After Labor Day",
    url: "https://traverseticker.com/news/decrease-in-parking-rates-coming-after-labor-day/",
    source_id: "src_ticker",
    published_at: "2026-08-28T14:00:00.000Z",
  }),
  story({
    id: "library",
    title: "Library News: The Dog Days of Summer",
    dek: "Concerts and crafts.",
    url: "https://www.oldmission.net/2026/08/library-dog-days-summer/",
    source_id: "src_omp_gazette",
    published_at: "2026-08-28T18:00:00.000Z",
  }),
  story({
    id: "glen_eyrie",
    title: "Old Neighborhood on the North Shore",
    dek: "Glen Eyrie going strong for a century and more",
    url: "https://betsiecurrent.com/old-neighborhood-on-north-shore-glen-eyrie/",
    source_id: "src_betsie",
    published_at: "2026-08-28T17:00:00.000Z",
  }),
  story({
    id: "ski",
    title: "Steve Kershner added to Michigan Ski Hall of Fame",
    url: "https://antrimreview.net/content/steve-kershner-added-michigan-ski-hall-fame",
    source_id: "src_antrim_review",
    published_at: "2026-08-28T16:00:00.000Z",
  }),
  story({
    id: "locals",
    title:
      "Ready, Set, Locals Summer! Tourist hot spots become local haunts once more",
    url: "https://northernexpress.com/news/feature/ready-set-locals-summer/",
    source_id: "src_northern",
    published_at: "2026-08-28T15:00:00.000Z",
  }),
  story({
    id: "stimson",
    title: "Stimson Street reconstruction project begins Monday in Cadillac",
    url: "https://www.9and10news.com/2026/08/28/stimson-street/",
    source_id: "src_910",
    published_at: "2026-08-28T13:00:00.000Z",
  }),
  story({
    id: "omp_crash",
    title: "Driver Charged in Center Road Crash That Killed Teenager, Bond Set",
    url: "https://www.oldmission.net/2026/08/driver-charged-head-on-collision/",
    source_id: "src_omp_gazette",
    published_at: "2026-08-28T19:00:00.000Z",
  }),
  story({
    id: "cadillac_crash",
    title: "Three-vehicle crash on M-115 near Cadillac kills Inkster man",
    url: "https://www.9and10news.com/2026/08/27/three-vehicle-crash-on-m-115-near-cadillac-kills-inkster-man/",
    source_id: "src_910",
    published_at: "2026-08-27T18:00:00.000Z",
  }),
  story({
    id: "weekly_note",
    title:
      "Supervisor’s Weekly Note: New Boardwalk Debuts at Pelizzari, WOMP and Bonobo Lawsuit Updates & More",
    url: "https://www.oldmission.net/2026/08/hemlocks-boardwalk-womp-lawsuit/",
    source_id: "src_omp_gazette",
    published_at: "2026-08-28T18:30:00.000Z",
  }),
  // Eyes Only Media flood — would dominate a Monday letter without the family cap.
  story({
    id: "ticker_crash",
    title: "Driver Charged in Center Road Crash Near Acme After Weekend Collision",
    url: "https://www.traverseticker.com/news/driver-charged-center-road/",
    source_id: "src_ticker",
    published_at: "2026-08-28T20:00:00.000Z",
  }),
  story({
    id: "ticker_sheriff",
    title:
      "Sheriff's office looking for information on weekend burglary in Garfield Township",
    url: "https://www.traverseticker.com/news/sheriff-looking-burglary/",
    source_id: "src_ticker",
    published_at: "2026-08-28T19:30:00.000Z",
  }),
  story({
    id: "ticker_zoning",
    title: "City zoning board weighs housing ordinance changes Monday",
    url: "https://www.traverseticker.com/news/zoning-housing-ordinance/",
    source_id: "src_ticker",
    published_at: "2026-08-28T18:00:00.000Z",
  }),
  story({
    id: "nx_budget",
    title: "County budget talks reopen after midyear shortfall",
    url: "https://northernexpress.com/news/county-budget-shortfall/",
    source_id: "src_northern",
    published_at: "2026-08-28T17:30:00.000Z",
  }),
  story({
    id: "nx_arrest",
    title: "Arrests follow downtown assault investigation",
    url: "https://northernexpress.com/news/downtown-assault-arrests/",
    source_id: "src_northern",
    published_at: "2026-08-28T16:30:00.000Z",
  }),
];

const data = {
  stories,
  sources,
  events: [],
  athletics: [],
  editions: [],
  email_editions: [
    {
      date: "2026-08-28",
      captured_at: "2026-08-28T12:00:00.000Z",
      lead: null,
      around: [
        {
          title: "Cherry Capital Men’s Chorus Celebrates 60 years",
          dek: "Anniversary show.",
          url: "https://www.9and10news.com/chorus/",
          sources: ["9&10 News"],
        },
      ],
      alerts: [],
      tonight: [],
      civic: [],
      sports: [],
    },
  ],
  school_days: [],
  subscribers: [],
} as unknown as AppData;

const letter = buildEmailEditionSnapshot(data, saturday);
assert.ok(letter.around.length <= LETTER_AROUND_MAX);
assert.ok(
  letter.around.length >= 5,
  `expected ≥5 around, got ${letter.around.length}`,
);

const titles = letter.around.map((c) => c.title);
const urls = letter.around.map((c) => c.url);

assert.ok(
  urls.some((u) => u.includes("cedar-polka-fest")),
  "Polka Fest in letter",
);
assert.ok(
  urls.some((u) => u.includes("garfield-township")),
  "Garfield ban in letter",
);
assert.ok(urls.some((u) => u.includes("leelanau")), "Leelanau housing in letter");
assert.ok(
  urls.some((u) => u.includes("fema-aid") || u.includes("april-flooding")),
  "FEMA flood aid in letter",
);
assert.ok(urls.some((u) => u.includes("treasurer")), "GT treasurer report in letter");

const iprCount = urls.filter((u) =>
  u.includes("interlochenpublicradio.org"),
).length;
assert.ok(
  iprCount >= 3,
  `expected 3 IPR cards, got ${iprCount}: ${titles.join(" | ")}`,
);

const reCount = letter.around.filter((c) =>
  (c.sources ?? []).some((s) => /record-eagle/i.test(s)),
).length;
assert.ok(reCount <= 2, "RE cap stays ≤2");
assert.ok(reCount >= 1, "RE treasurer should rank");

const eyesOnlyCount = letter.around.filter((c) =>
  (c.sources ?? []).some((s) =>
    /^(The Ticker|Northern Express|Traverse City Business News)$/i.test(s),
  ),
).length;
assert.ok(
  eyesOnlyCount <= 2,
  `Eyes Only Media family (Ticker/NE/TCBN) cap stays ≤2, got ${eyesOnlyCount}: ${titles.join(" | ")}`,
);
assert.ok(
  eyesOnlyCount < letter.around.length / 2 || letter.around.length < 4,
  `Monday-like mix must not be majority Eyes Only (${eyesOnlyCount}/${letter.around.length})`,
);

for (const bad of [
  /Library News/i,
  /Ski Hall of Fame/i,
  /Ready,? Set,? Locals/i,
  /Glen Eyrie|Old Neighborhood/i,
  /Stimson Street/i,
  /Weekly Note/i,
  /M-115 near Cadillac/i,
]) {
  assert.ok(
    !titles.some((t) => bad.test(t)),
    `lifestyle/out card must not appear: ${bad}`,
  );
}

// Smaller desks' hard news should beat 9&10 crash flood; IPR can take 3.
assert.ok(
  !urls.some((u) => u.includes("m-115-near-cadillac")),
  "9&10 Cadillac crash must not crowd out smaller-desk hard news",
);

const subject = buildMorningLetterSubject(letter);
const phrasePart = subject.replace(/^🗞️\s*/, "");
assert.match(subject, /^🗞️ /);
assert.match(subject, /Garfield data-center ban/);
assert.match(subject, /Leelanau housing survey/);
assert.match(subject, /FEMA deadline Monday/);
assert.doesNotMatch(
  subject,
  /Library News|Ski Hall|Ready,? Set|Polka|Glen Eyrie|Driver Charged in Center(?! Road)|Sheriff'?s office looking/i,
);
assert.ok(
  phrasePart.length <= 84,
  `phrase length ${phrasePart.length} must be ≤84`,
);
assert.equal(subject.split(" · ").length, 3);

// Scarce non-Eyes-Only desks: family still hard-caps at 2 (not a majority).
function clusterStub(
  id: string,
  title: string,
  sourceId: string,
  name: string,
  hoursAgo: number,
): ClusteredStory {
  return {
    id,
    title,
    dek: "hard news housing crash",
    url: `https://example.com/${id}`,
    published_at: new Date(saturday.getTime() - hoursAgo * 3600_000).toISOString(),
    is_original: false,
    image_url: null,
    byline: null,
    slug: null,
    body: null,
    sources: [{ id: sourceId, name }],
    paywalled: false,
  } as ClusteredStory;
}
const scarce = [
  ...[1, 2, 3, 4, 5, 6].map((i) =>
    clusterStub(
      `t${i}`,
      `Ticker housing crash charges ${i}`,
      "src_ticker",
      "The Ticker",
      i,
    ),
  ),
  ...[1, 2, 3, 4, 5].map((i) =>
    clusterStub(
      `n${i}`,
      `Northern Express budget arrest ${i}`,
      "src_northern",
      "Northern Express",
      i,
    ),
  ),
  clusterStub(
    "ipr1",
    "IPR only one housing survey",
    "src_ipr",
    "IPR News",
    10,
  ),
];
const scarcePicked = selectAroundTheBay(scarce, {
  limit: 6,
  maxSports: 0,
  maxRecordEagle: 2,
  maxHeavyWire: 2,
  maxEyesOnly: 2,
  preferHardNews: true,
  maxPerSource: 3,
  now: saturday,
});
const scarceEyes = scarcePicked.filter(isEyesOnlyCluster).length;
assert.equal(scarceEyes, 2, `scarce-desk Eyes Only must hit family cap 2, got ${scarceEyes}`);
assert.ok(
  scarceEyes < scarcePicked.length / 2 || scarcePicked.length < 4,
  `scarce mix must not be majority Eyes Only (${scarceEyes}/${scarcePicked.length})`,
);

console.log(
  `dry-run-letter-hard-news: ok\n  around=${titles.join(" · ")}\n  subject=${subject}\n  phraseLen=${phrasePart.length}\n  scarceEyes=${scarceEyes}/${scarcePicked.length}`,
);
