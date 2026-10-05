/**
 * Auto mix exclusion: past letter + homepage archive (URL / title),
 * same-story rewrites inside 21 days, and outlet caps.
 *
 *   npm run test:auto-mix-exclusion
 */
import assert from "node:assert/strict";
import {
  buildEmailEditionSnapshot,
  collectPastBayExclusion,
  SAME_STORY_LOOKBACK_DAYS,
  selectFreshAroundTheBay,
  titlesLikelySameStory,
  wasExcludedByPastBay,
} from "../src/lib/email-editions";
import {
  cardMatchKind,
  findPastEditionAppearances,
  formatPastRunFlag,
} from "../src/lib/desk-letter-cards";
import { clusterStories } from "../src/lib/pull/cluster";
import type {
  AppData,
  EditionSnapshot,
  EmailEditionSnapshot,
  Source,
  Story,
} from "../src/lib/types";

assert.equal(SAME_STORY_LOOKBACK_DAYS, 21, "same-story lookback stays ~21 days");

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
    id: "src_northern",
    name: "Northern Express",
    beat_id: "beat_news",
    homepage: "https://www.northernexpress.com",
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
  {
    id: "src_tcbn",
    name: "Traverse City Business News",
    beat_id: "beat_news",
    homepage: "https://www.tcbusinessnews.com",
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
    published_at: partial.published_at ?? "2026-09-29T10:00:00.000Z",
    is_original: false,
    byline: null,
    slug: null,
    image_url: null,
    body: null,
    ...partial,
  };
}

function bayCard(
  title: string,
  url: string,
  sourceName: string,
  date: string,
): EditionSnapshot["around"][number] {
  return {
    title,
    dek: "Prior bay head.",
    url,
    published_at: `${date}T12:00:00.000Z`,
    sources: [sourceName],
    byline: null,
    slug: null,
    is_original: false,
  };
}

const INTERLOCHEN_URL =
  "https://www.record-eagle.com/news/local_news/interlochen-lawsuit";
const INTERLOCHEN_TITLE = "Interlochen Center faces former student lawsuit";
const HOUSING_URL =
  "https://www.record-eagle.com/news/local_news/summer-housing-prices";
const HOUSING_TITLE = "Summer Housing Prices Soar Across Grand Traverse";
const COMMON_URL =
  "https://www.northernexpress.com/news/finding-common-ground/";
const COMMON_TITLE = "Finding Common Ground on local housing";
const HULL_URL = "https://www.9and10news.com/2026/09/22/hull-park-assaults/";
const HULL_TITLE = "Hull Park assaults under investigation";
const MORATORIUM_TICKER =
  "Issues Moratorium on Data Centers";
const MORATORIUM_910 =
  "Grand Traverse County enacts data center moratorium";

const letterArchive: EmailEditionSnapshot = {
  date: "2026-09-22",
  captured_at: "2026-09-22T12:00:00.000Z",
  lead: null,
  around: [
    {
      title: INTERLOCHEN_TITLE,
      dek: "Courts.",
      url: INTERLOCHEN_URL,
      sources: ["Record-Eagle"],
      paywalled: true,
    },
    {
      title: HULL_TITLE,
      dek: "Crime.",
      url: HULL_URL,
      sources: ["9&10 News"],
    },
  ],
  alerts: [],
  tonight: [],
  civic: [],
  sports: [],
};

const homepageSep26: EditionSnapshot = {
  date: "2026-09-26",
  captured_at: "2026-09-26T12:00:00.000Z",
  lead: null,
  around: [bayCard(HOUSING_TITLE, HOUSING_URL, "Record-Eagle", "2026-09-26")],
  events: [],
  civic: [],
};

const homepageSep27: EditionSnapshot = {
  date: "2026-09-27",
  captured_at: "2026-09-27T12:00:00.000Z",
  lead: null,
  around: [bayCard(COMMON_TITLE, COMMON_URL, "Northern Express", "2026-09-27")],
  events: [],
  civic: [],
};

const at = new Date("2026-09-29T16:00:00.000Z");
const corpus = collectPastBayExclusion(
  [letterArchive],
  [homepageSep26, homepageSep27],
  at,
);

assert.equal(
  wasExcludedByPastBay({ title: INTERLOCHEN_TITLE, url: INTERLOCHEN_URL }, corpus),
  true,
  "URL from past letter is excluded",
);
assert.equal(
  wasExcludedByPastBay(
    { title: INTERLOCHEN_TITLE, url: "https://other.example/interlochen" },
    corpus,
  ),
  true,
  "normalized title from past letter is excluded even on new URL",
);
assert.equal(
  wasExcludedByPastBay({ title: HOUSING_TITLE, url: HOUSING_URL }, corpus),
  true,
  "URL from past homepage edition is excluded",
);
assert.equal(
  wasExcludedByPastBay({ title: COMMON_TITLE, url: COMMON_URL }, corpus),
  true,
  "Sep 27 homepage card is excluded",
);
assert.equal(
  titlesLikelySameStory(MORATORIUM_TICKER, MORATORIUM_910),
  true,
  "moratorium rewrite is same story",
);

const rewriteCorpus = collectPastBayExclusion(
  [
    {
      ...letterArchive,
      date: "2026-09-20",
      around: [
        {
          title: MORATORIUM_TICKER,
          dek: "County.",
          url: "https://www.traverseticker.com/news/data-center-moratorium/",
          sources: ["The Ticker"],
        },
      ],
    },
  ],
  [],
  at,
);
assert.equal(
  wasExcludedByPastBay(
    {
      title: MORATORIUM_910,
      url: "https://www.9and10news.com/2026/09/29/data-center-moratorium/",
    },
    rewriteCorpus,
  ),
  true,
  "same-story rewrite within 21 days is excluded",
);

// Desk flags explain exact vs same-story.
const deskRuns = findPastEditionAppearances(
  {
    title: "Summer housing prices soar in Traverse City market",
    url: "https://www.9and10news.com/2026/09/29/housing-rewrite/",
  },
  {
    email_editions: [letterArchive],
    editions: [homepageSep26, homepageSep27],
    today: "2026-09-29",
  },
);
assert.ok(
  deskRuns.some((r) => r.date === "2026-09-26" && r.kind === "homepage"),
  "Desk flags Sep 26 homepage for housing rewrite",
);
const housingRun = deskRuns.find((r) => r.date === "2026-09-26");
assert.equal(housingRun?.match, "same_story");
assert.match(
  formatPastRunFlag(housingRun!),
  /same story as .*Summer Housing Prices Soar.*Sep 26 homepage/,
);

assert.equal(
  cardMatchKind(
    { title: INTERLOCHEN_TITLE, url: INTERLOCHEN_URL },
    letterArchive.around[0],
  ),
  "exact",
);

// Full letter + homepage auto mix must drop the Sep 29 recycled set.
const freshStories = [
  story({
    id: "fresh_1",
    title: "County road millage draft heads to November ballot",
    url: "https://www.interlochenpublicradio.org/2026/09/29/millage/",
    source_id: "src_ipr",
    published_at: "2026-09-29T09:00:00.000Z",
  }),
  story({
    id: "fresh_2",
    title: "West Bay ferry schedule expands for fall",
    url: "https://www.9and10news.com/2026/09/29/ferry/",
    source_id: "src_910",
    published_at: "2026-09-29T08:30:00.000Z",
  }),
  story({
    id: "fresh_3",
    title: "Acme Township park grant clears committee",
    url: "https://www.traverseticker.com/news/acme-park-grant/",
    source_id: "src_ticker",
    published_at: "2026-09-29T08:00:00.000Z",
  }),
  story({
    id: "fresh_4",
    title: "Leelanau Trail resurfacing starts Monday",
    url: "https://www.northernexpress.com/news/leelanau-trail/",
    source_id: "src_northern",
    published_at: "2026-09-29T07:30:00.000Z",
  }),
  story({
    id: "fresh_5",
    title: "Boardman River bridge deck repairs start Monday",
    url: "https://www.interlochenpublicradio.org/2026/09/29/bridge-deck/",
    source_id: "src_ipr",
    published_at: "2026-09-29T07:00:00.000Z",
  }),
  story({
    id: "fresh_6",
    title: "Downtown parking study finds evening gaps",
    url: "https://www.record-eagle.com/2026/09/29/parking-study",
    source_id: "src_re",
    published_at: "2026-09-29T06:30:00.000Z",
  }),
];

const recycledStories = [
  story({
    id: "interlochen",
    title: INTERLOCHEN_TITLE,
    url: INTERLOCHEN_URL,
    source_id: "src_re",
    published_at: "2026-09-22T10:00:00.000Z",
  }),
  story({
    id: "housing",
    title: HOUSING_TITLE,
    url: HOUSING_URL,
    source_id: "src_re",
    published_at: "2026-09-26T10:00:00.000Z",
  }),
  story({
    id: "common",
    title: COMMON_TITLE,
    url: COMMON_URL,
    source_id: "src_northern",
    published_at: "2026-09-27T10:00:00.000Z",
  }),
  story({
    id: "hull",
    title: HULL_TITLE,
    url: HULL_URL,
    source_id: "src_910",
    published_at: "2026-09-22T11:00:00.000Z",
  }),
];

const data = {
  beats: [],
  sources,
  stories: [...recycledStories, ...freshStories],
  events: [],
  athletics: [],
  schools: [],
  subscribers: [],
  unsubscribed: [],
  tips: [],
  event_tips: [],
  last_pull_at: null,
  editions: [homepageSep26, homepageSep27],
  email_editions: [letterArchive],
  drafts: [],
} as unknown as AppData;

const letter = buildEmailEditionSnapshot(data, at);
const bannedUrls = new Set([
  INTERLOCHEN_URL,
  HOUSING_URL,
  COMMON_URL,
  HULL_URL,
]);
assert.ok(
  letter.around.every((c) => !bannedUrls.has(c.url)),
  "letter auto mix drops Sep 22–27 recycled cards",
);
assert.ok(
  letter.around.some((c) => c.url.includes("millage")),
  "letter auto mix prefers never-run hard news",
);

const clusters = clusterStories(data.stories, data.sources);
const bay = selectFreshAroundTheBay(clusters, data.editions, at, {
  email_editions: data.email_editions,
});
assert.ok(
  bay.every((c) => !bannedUrls.has(c.url)),
  "homepage auto mix drops letter + homepage archive cards",
);

// Outlet caps: flood with 9&10 / RE / Eyes Only — still ≤2 each family.
const capStories: Story[] = [];
for (let i = 0; i < 6; i++) {
  capStories.push(
    story({
      id: `910_${i}`,
      title: `County budget item ${i} clears committee vote`,
      url: `https://www.9and10news.com/2026/09/29/budget-${i}/`,
      source_id: "src_910",
      published_at: `2026-09-29T1${i}:00:00.000Z`,
    }),
  );
  capStories.push(
    story({
      id: `re_${i}`,
      title: `City Hall vote ${i} advances zoning rewrite`,
      url: `https://www.record-eagle.com/2026/09/29/zoning-${i}`,
      source_id: "src_re",
      published_at: `2026-09-29T1${i}:05:00.000Z`,
    }),
  );
  capStories.push(
    story({
      id: `ticker_${i}`,
      title: `Harbor plan ${i} draws public comment tonight`,
      url: `https://www.traverseticker.com/news/harbor-${i}/`,
      source_id: "src_ticker",
      published_at: `2026-09-29T1${i}:10:00.000Z`,
    }),
  );
  capStories.push(
    story({
      id: `nx_${i}`,
      title: `Trail expansion ${i} funded by state grant`,
      url: `https://www.northernexpress.com/news/trail-${i}/`,
      source_id: "src_northern",
      published_at: `2026-09-29T1${i}:15:00.000Z`,
    }),
  );
  capStories.push(
    story({
      id: `tcbn_${i}`,
      title: `Downtown retail vacancy ${i} report released`,
      url: `https://www.tcbusinessnews.com/news/vacancy-${i}/`,
      source_id: "src_tcbn",
      published_at: `2026-09-29T1${i}:20:00.000Z`,
    }),
  );
}
// Prefer hard-news IPR fillers so caps are the binding constraint.
for (let i = 0; i < 8; i++) {
  capStories.push(
    story({
      id: `ipr_${i}`,
      title: `School board ${i} approves bus route changes`,
      url: `https://www.interlochenpublicradio.org/2026/09/29/buses-${i}/`,
      source_id: "src_ipr",
      published_at: `2026-09-29T0${i}:00:00.000Z`,
    }),
  );
}

const capData = {
  ...data,
  stories: capStories,
  editions: [],
  email_editions: [],
} as unknown as AppData;
const capLetter = buildEmailEditionSnapshot(capData, at);
const capBay = selectFreshAroundTheBay(
  clusterStories(capData.stories, capData.sources),
  [],
  at,
  { email_editions: [] },
);

function countOutlet(
  cards: Array<{ sources: string[] | Array<{ name: string }> }>,
  re: RegExp,
): number {
  return cards.filter((c) =>
    c.sources.some((s) => re.test(typeof s === "string" ? s : s.name)),
  ).length;
}
function countEyesOnly(
  cards: Array<{ sources: string[] | Array<{ name: string }> }>,
): number {
  return cards.filter((c) =>
    c.sources.some((s) => {
      const name = typeof s === "string" ? s : s.name;
      return /^(The Ticker|Northern Express|Traverse City Business News)$/i.test(
        name,
      );
    }),
  ).length;
}

assert.ok(
  countOutlet(capLetter.around, /9\s*&\s*10/i) <= 2,
  `letter 9&10 cap ≤2, got ${countOutlet(capLetter.around, /9\s*&\s*10/i)}`,
);
assert.ok(
  countOutlet(capLetter.around, /record-eagle/i) <= 2,
  `letter RE cap ≤2, got ${countOutlet(capLetter.around, /record-eagle/i)}`,
);
assert.ok(
  countEyesOnly(capLetter.around) <= 2,
  `letter Eyes Only cap ≤2, got ${countEyesOnly(capLetter.around)}`,
);
assert.ok(
  countOutlet(capBay, /9\s*&\s*10/i) <= 2,
  `bay 9&10 cap ≤2, got ${countOutlet(capBay, /9\s*&\s*10/i)}`,
);
assert.ok(
  countOutlet(capBay, /record-eagle/i) <= 2,
  `bay RE cap ≤2, got ${countOutlet(capBay, /record-eagle/i)}`,
);
assert.ok(
  countEyesOnly(capBay) <= 2,
  `bay Eyes Only cap ≤2, got ${countEyesOnly(capBay)}`,
);

console.log(
  `test-auto-mix-exclusion: ok (letter=${letter.around.length}, bay=${bay.length}, caps letter=${capLetter.around.length}/bay=${capBay.length})`,
);