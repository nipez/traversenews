/**
 * Dry-run / unit checks: homepage Around prefers hard news by default, and
 * Desk can lock today’s edition bay independent of the morning letter.
 *
 *   npx tsx scripts/test-homepage-bay-lock.ts
 */
import assert from "node:assert/strict";
import { looksLikeHardNews } from "../src/lib/around";
import {
  BAY_AROUND_MAX,
  buildEditionSnapshot,
  detroitDateKey,
} from "../src/lib/editions";
import {
  buildEmailEditionSnapshot,
  selectFreshAroundTheBay,
} from "../src/lib/email-editions";
import { buildHomeSnapshot } from "../src/lib/public-snapshots";
import { clusterStories } from "../src/lib/pull/cluster";
import type {
  AppData,
  EditionSnapshot,
  EditionStoryCard,
  EmailEditionSnapshot,
  Source,
  Story,
} from "../src/lib/types";

const saturday = new Date("2026-09-12T15:00:00.000Z");
const todayKey = detroitDateKey(saturday);

function src(id: string, name: string, homepage: string): Source {
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
  src("src_stella", "Stella’s", "https://stellas.com"),
  src("src_metrofire", "Metro Fire", "https://metrofire.com"),
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
    byline: null,
    is_original: false,
    slug: null,
    image_url: null,
    body: null,
  };
}

const fridaySoft: EditionSnapshot = {
  date: "2026-09-11",
  captured_at: "2026-09-11T12:00:00.000Z",
  lead: null,
  around: [
    {
      title: "Metro Fire hosts 9/11 memorial ceremony",
      dek: "Annual remembrance.",
      url: "https://metrofire.com/9-11-memorial-2026/",
      published_at: "2026-09-11T10:00:00.000Z",
      sources: ["Metro Fire"],
      byline: null,
      slug: null,
      is_original: false,
    },
    {
      title: "Stella’s fall lifestyle roundup",
      dek: "Soft features.",
      url: "https://stellas.com/fall-lifestyle-2026/",
      published_at: "2026-09-11T09:00:00.000Z",
      sources: ["Stella’s"],
      byline: null,
      slug: null,
      is_original: false,
    },
  ],
  events: [],
  civic: [],
};

const stories: Story[] = [
  story({
    id: "soft_memorial",
    title: "Metro Fire hosts 9/11 memorial ceremony",
    url: "https://metrofire.com/9-11-memorial-2026/",
    source_id: "src_metrofire",
    published_at: "2026-09-11T10:00:00.000Z",
  }),
  story({
    id: "soft_stella",
    title: "Stella’s fall lifestyle roundup",
    url: "https://stellas.com/fall-lifestyle-2026/",
    source_id: "src_stella",
    published_at: "2026-09-11T09:00:00.000Z",
  }),
  story({
    id: "soft_farm",
    title: "Farm stand features heirloom tomatoes this week",
    url: "https://stellas.com/farm-heirloom-tomatoes/",
    source_id: "src_stella",
    published_at: "2026-09-12T08:00:00.000Z",
  }),
  story({
    id: "hard_garfield",
    title:
      "Garfield Township puts a 1-year ban on data centers, cryptocurrency mining",
    url: "https://www.interlochenpublicradio.org/2026/09/12/garfield-ban/",
    source_id: "src_ipr",
    published_at: "2026-09-12T14:00:00.000Z",
  }),
  story({
    id: "hard_housing",
    title:
      "Work in Leelanau Co. but can't afford to live there? Housing advocates want to hear from you",
    url: "https://www.interlochenpublicradio.org/2026/09/12/leelanau-housing/",
    source_id: "src_ipr",
    published_at: "2026-09-12T13:30:00.000Z",
  }),
  story({
    id: "hard_flood",
    title: "FEMA flood aid deadlines approach for April flooding victims",
    url: "https://www.interlochenpublicradio.org/2026/09/12/fema-aid/",
    source_id: "src_ipr",
    published_at: "2026-09-12T13:00:00.000Z",
  }),
  story({
    id: "hard_treasurer",
    title: "Grand Traverse treasurer under oath on midyear shortfall",
    url: "https://www.record-eagle.com/treasurer-oath",
    source_id: "src_re",
    published_at: "2026-09-12T12:30:00.000Z",
  }),
  story({
    id: "hard_zoning",
    title: "City zoning board weighs housing ordinance changes Monday",
    url: "https://www.traverseticker.com/news/zoning-housing-ordinance/",
    source_id: "src_ticker",
    published_at: "2026-09-12T12:00:00.000Z",
  }),
  story({
    id: "hard_crash",
    title: "Fatal crash closes M-72 near Acme Friday night",
    url: "https://www.9and10news.com/2026/09/12/m72-fatal/",
    source_id: "src_910",
    published_at: "2026-09-12T11:00:00.000Z",
  }),
  story({
    id: "polka",
    title: "Cedar Polka Fest dances August away",
    url: "https://glenarborsun.com/cedar-polka-fest-dances-august-away/",
    source_id: "src_glenarbor_sun",
    published_at: "2026-09-12T10:00:00.000Z",
  }),
];

const data = {
  stories,
  sources,
  events: [],
  athletics: [],
  editions: [fridaySoft],
  email_editions: [],
  school_days: [],
  subscribers: [],
} as unknown as AppData;

const clusters = clusterStories(data.stories, data.sources);
const bay = selectFreshAroundTheBay(clusters, data.editions, saturday);
const bayTitles = bay.map((c) => c.title);
const bayUrls = bay.map((c) => c.url);

assert.ok(
  !bayUrls.some((u) => u.includes("9-11-memorial")),
  "Friday memorial must not return on Saturday bay",
);
assert.ok(
  !bayUrls.some((u) => u.includes("fall-lifestyle")),
  "Friday Stella lifestyle must not return on Saturday bay",
);

const hardUpFront = bay.slice(0, 5);
const hardCount = hardUpFront.filter((c) => looksLikeHardNews(c)).length;
assert.ok(
  hardCount >= 4,
  `top of Saturday bay should be hard-news-forward, got ${hardCount}/5: ${hardUpFront.map((c) => c.title).join(" | ")}`,
);

const home = buildHomeSnapshot(data, saturday);
assert.ok(
  !home.around.some((c) => /9\/11 memorial|fall lifestyle/i.test(c.title)),
  "public homepage drops Friday soft leftovers",
);
assert.ok(
  home.around.some((c) => /data centers|Garfield/i.test(c.title)),
  "public homepage surfaces Garfield ban",
);

const edition = buildEditionSnapshot(data, saturday);
assert.ok(!edition.around_locked, "auto edition is unlocked");
assert.ok(
  edition.around.some((c) => /FEMA|flood/i.test(c.title)),
  "edition snapshot prefers flood aid hard news",
);

// Desk lock: custom short slate wins on homepage + edition rebuild/pull path.
const deskAround: EditionStoryCard[] = [
  {
    title: "City zoning board weighs housing ordinance changes Monday",
    dek: "",
    url: "https://www.traverseticker.com/news/zoning-housing-ordinance/",
    published_at: "2026-09-12T12:00:00.000Z",
    sources: ["The Ticker"],
    byline: null,
    slug: null,
    is_original: false,
  },
  {
    title: "Fatal crash closes M-72 near Acme Friday night",
    dek: "",
    url: "https://www.9and10news.com/2026/09/12/m72-fatal/",
    published_at: "2026-09-12T11:00:00.000Z",
    sources: ["9&10 News"],
    byline: null,
    slug: null,
    is_original: false,
  },
];

const lockedEdition = buildEditionSnapshot(data, saturday, {
  around: deskAround,
  around_locked: true,
});
assert.equal(lockedEdition.around_locked, true);
assert.equal(lockedEdition.around.length, 2);
assert.equal(lockedEdition.around[0].url, deskAround[0].url);

const dataWithLock = {
  ...data,
  editions: [fridaySoft, lockedEdition],
} as unknown as AppData;

const lockedHome = buildHomeSnapshot(dataWithLock, saturday);
assert.equal(lockedHome.around.length, 2, "locked homepage uses Desk length");
assert.equal(lockedHome.around[0].url, deskAround[0].url);
assert.equal(lockedHome.around[1].url, deskAround[1].url);

// Pull-path survival: rebuild with prior lock keeps Desk around.
const afterPull = buildEditionSnapshot(dataWithLock, saturday, {
  around: lockedEdition.around,
  around_locked: true,
});
assert.equal(afterPull.around_locked, true);
assert.equal(afterPull.around[0].url, deskAround[0].url);

// Letter lock stays independent — locked homepage must not force letter around.
const letter: EmailEditionSnapshot = buildEmailEditionSnapshot(
  dataWithLock,
  saturday,
);
assert.ok(!letter.around_locked, "letter stays auto when only homepage locked");
assert.ok(
  letter.around.some((c) => /Garfield|data centers/i.test(c.title)),
  "letter still auto-picks hard news",
);
assert.ok(
  letter.around.length <= 6,
  "letter Around cap unchanged",
);

const unlocked = buildEditionSnapshot(dataWithLock, saturday, {
  around_locked: false,
});
assert.ok(!unlocked.around_locked);
assert.ok(
  unlocked.around.length > 2,
  "reset to auto rebuilds a fuller hard-news bay",
);
assert.ok(unlocked.around.length <= BAY_AROUND_MAX);

console.log("test-homepage-bay-lock: ok");
console.log(
  `  auto bay (${bay.length}): ${bayTitles.slice(0, 6).join(" · ")}`,
);
console.log(`  todayKey=${todayKey}`);
