/**
 * Dry-run: homepage / dated-edition Around the bay must drop yesterday’s
 * edition cards (and same-story rewrites) — never pad with stale heads.
 * One-shot cards from older days may fill today’s bay. Staff original lead
 * may sit a second day.
 *
 *   npx tsx scripts/dry-run-bay-fresh.ts
 */
import assert from "node:assert/strict";
import { buildEditionSnapshot } from "../src/lib/editions";
import {
  BAY_AROUND_MIN_FRESH,
  collectPriorEditionBayIdentities,
  selectFreshAroundTheBay,
  wasInPriorLetter,
} from "../src/lib/email-editions";
import { buildHomeSnapshot } from "../src/lib/public-snapshots";
import { clusterStories } from "../src/lib/pull/cluster";
import type { AppData, EditionSnapshot, Source, Story } from "../src/lib/types";

const STALE_HEADS = [
  {
    title: "Deputy City Manager search advances",
    url: "https://www.traverseticker.com/news/deputy-city-manager-example/",
    source_id: "src_ticker",
  },
  {
    title: "Brown Bridge Quiet Area trail work",
    url: "https://www.record-eagle.com/brown-bridge",
    source_id: "src_re",
  },
  {
    title: "Fire chief outlines staffing plan",
    url: "https://www.9and10news.com/2026/08/25/fire-chief-staffing/",
    source_id: "src_910",
  },
  {
    title: "Humanitarian honorees named for fall banquet",
    url: "https://www.traverseticker.com/news/humanitarian-honorees/",
    source_id: "src_ticker",
  },
  {
    title: "East Side Placemaking project moves ahead",
    url: "https://www.record-eagle.com/east-side-placemaking",
    source_id: "src_re",
  },
  {
    title: "July Up North: A Recap",
    url: "https://www.northernexpress.com/july-up-north-recap/",
    source_id: "src_northern",
  },
] as const;

const TICKER_MORATORIUM_URL =
  "https://www.traverseticker.com/news/issues-moratorium-on-data-centers/";
const TICKER_MORATORIUM_TITLE = "Issues Moratorium on Data Centers";
const NINE_MORATORIUM_URL =
  "https://www.9and10news.com/2026/08/26/enacts-data-center-moratorium/";
const NINE_MORATORIUM_TITLE =
  "Grand Traverse County enacts data center moratorium";

const FRESH = [
  {
    title: "Harbor Commission sets fall dock fees",
    url: "https://www.9and10news.com/2026/08/26/harbor-dock-fees/",
    source_id: "src_910",
  },
  {
    title: "West Bay ferry schedule expands for fall",
    url: "https://www.interlochenpublicradio.org/2026/08/26/bay-ferry/",
    source_id: "src_ipr",
  },
  {
    title: "City studies West Front sewer upgrades",
    url: "https://www.traverseticker.com/news/west-bay-sewer/",
    source_id: "src_ticker",
  },
  {
    title: "Leelanau Trail resurfacing starts Monday",
    url: "https://www.9and10news.com/2026/08/26/leelanau-trail/",
    source_id: "src_910",
  },
  {
    title: "Petoskey harbor dredging bids opened",
    url: "https://upnorthlive.com/news/local/2026/08/26/petoskey-harbor/",
    source_id: "src_upnorth",
  },
  {
    title: "Downtown parking study finds evening gaps",
    url: "https://www.traverseticker.com/news/downtown-parking-study/",
    source_id: "src_ticker",
  },
  {
    title: "TCAPS board confirms first-day bus routes",
    url: "https://www.interlochenpublicradio.org/2026/08/26/school-start/",
    source_id: "src_ipr",
  },
  {
    title: "Acme Township park grant clears committee",
    url: "https://www.9and10news.com/2026/08/26/acme-township-park/",
    source_id: "src_910",
  },
  {
    title: "Boardman River cleanup draws weekend volunteers",
    url: "https://www.traverseticker.com/news/boardman-river-cleanup/",
    source_id: "src_ticker",
  },
  {
    title: "County road crews prep for early frost",
    url: "https://www.record-eagle.com/2026/08/26/fresh-re-only",
    source_id: "src_re",
  },
] as const;

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
    id: "src_upnorth",
    name: "UpNorthLive",
    beat_id: "beat_news",
    homepage: "https://upnorthlive.com",
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
    dek: partial.dek ?? "Traverse City area news.",
    published_at: partial.published_at ?? "2026-08-26T10:00:00.000Z",
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
  date = "2026-08-25",
): EditionSnapshot["around"][number] {
  return {
    title,
    dek: "Prior edition bay head.",
    url,
    published_at: `${date}T12:00:00.000Z`,
    sources: [sourceName],
    byline: null,
    slug: null,
    is_original: false,
  };
}

const yesterdayEdition: EditionSnapshot = {
  date: "2026-08-25",
  captured_at: "2026-08-25T12:00:00.000Z",
  lead: {
    title: "Staff original on the bay shoreline",
    dek: "Owned lead from Tuesday.",
    url: "https://traverse.news/story/staff-shoreline",
    published_at: "2026-08-25T11:00:00.000Z",
    sources: ["traverse.news"],
    byline: "By traverse.news",
    slug: "staff-shoreline",
    is_original: true,
  },
  around: [
    ...STALE_HEADS.map((h) =>
      bayCard(
        h.title,
        h.url,
        sources.find((s) => s.id === h.source_id)?.name ?? "Wire",
      ),
    ),
    bayCard(TICKER_MORATORIUM_TITLE, TICKER_MORATORIUM_URL, "The Ticker"),
  ],
  events: [],
  civic: [],
};

const oldLeftoverEdition: EditionSnapshot = {
  date: "2026-08-22",
  captured_at: "2026-08-22T12:00:00.000Z",
  lead: null,
  around: [
    bayCard(
      "July Up North: A Recap",
      "https://www.northernexpress.com/july-up-north-recap/",
      "Northern Express",
      "2026-08-22",
    ),
  ],
  events: [],
  civic: [],
};

const priorBay = collectPriorEditionBayIdentities(yesterdayEdition);
for (const head of STALE_HEADS) {
  assert.equal(
    wasInPriorLetter({ title: head.title, url: head.url }, priorBay),
    true,
    `prior edition must mark ${head.title}`,
  );
}

const stories: Story[] = [
  ...STALE_HEADS.map((h, i) =>
    story({
      id: `stale_${i}`,
      title: h.title,
      url: h.url,
      source_id: h.source_id,
      dek: "Still scoring high from yesterday’s edition.",
      published_at: "2026-08-25T15:00:00.000Z",
    }),
  ),
  story({
    id: "s_moratorium_ticker",
    title: TICKER_MORATORIUM_TITLE,
    url: TICKER_MORATORIUM_URL,
    source_id: "src_ticker",
    dek: "On yesterday’s edition.",
    published_at: "2026-08-25T14:00:00.000Z",
  }),
  story({
    id: "s_moratorium_910",
    title: NINE_MORATORIUM_TITLE,
    url: NINE_MORATORIUM_URL,
    source_id: "src_910",
    dek: "Second-desk rewrite of yesterday’s bay card.",
    published_at: "2026-08-26T11:00:00.000Z",
  }),
  story({
    id: "s_original",
    title: "Staff original on the bay shoreline",
    url: "https://traverse.news/story/staff-shoreline",
    source_id: "src_ticker",
    dek: "Owned reporting — may sit a second day as lead.",
    published_at: "2026-08-25T11:00:00.000Z",
    is_original: true,
    byline: "By traverse.news",
    slug: "staff-shoreline",
  }),
  ...FRESH.map((h, i) =>
    story({
      id: `fresh_${i}`,
      title: h.title,
      url: h.url,
      source_id: h.source_id,
      dek: "New local reporting for Wednesday’s pile.",
      published_at: `2026-08-26T0${Math.min(9, i)}:00:00.000Z`,
    }),
  ),
];

const data = {
  beats: [],
  sources,
  stories,
  events: [],
  athletics: [],
  schools: [],
  subscribers: [],
  unsubscribed: [],
  tips: [],
  event_tips: [],
  last_pull_at: null,
  editions: [yesterdayEdition, oldLeftoverEdition],
  email_editions: [],
  drafts: [],
  section_headers: {
    "whats-on": null,
    sports: null,
    civic: null,
    schools: null,
    local: null,
  },
} as unknown as AppData;

const wednesday = new Date("2026-08-26T16:00:00.000Z");
const clusters = clusterStories(data.stories, data.sources);
const freshBay = selectFreshAroundTheBay(clusters, data.editions, wednesday);
const edition = buildEditionSnapshot(data, wednesday);
const home = buildHomeSnapshot(data, wednesday);

function assertNoStaleHeads(
  cards: Array<{ title: string; url: string }>,
  label: string,
) {
  for (const head of STALE_HEADS) {
    assert.ok(
      cards.every((c) => c.url !== head.url && c.title !== head.title),
      `${label} must drop ${head.title}`,
    );
  }
  assert.ok(
    cards.every(
      (c) =>
        c.url !== NINE_MORATORIUM_URL &&
        c.url !== TICKER_MORATORIUM_URL &&
        !/moratorium/i.test(c.title),
    ),
    `${label} must drop same-story rewrite of yesterday’s moratorium card`,
  );
}

assertNoStaleHeads(freshBay, "selectFreshAroundTheBay");
assertNoStaleHeads(edition.around, "buildEditionSnapshot");
assertNoStaleHeads(home.around, "buildHomeSnapshot");

assert.equal(edition.date, "2026-08-26");
assert.ok(
  edition.around.some((c) => FRESH.some((f) => f.url === c.url)),
  "edition bay should include fresh cards",
);
assert.ok(
  home.around.some((c) => FRESH.some((f) => f.url === c.url)),
  "homepage bay should include fresh cards",
);

assert.ok(
  edition.lead?.slug === "staff-shoreline",
  "staff original lead may sit a second day",
);
assert.ok(
  home.lead?.slug === "staff-shoreline",
  "homepage staff original lead may sit a second day",
);

assert.ok(
  edition.around.length <= 18 && home.around.length <= 18,
  "bay soft ceiling stays 18",
);
assert.ok(
  edition.around.filter((c) =>
    c.sources.some((s) => /record-eagle/i.test(s)),
  ).length <= 2,
  "Record-Eagle edition bay cap stays 2",
);
assert.ok(
  home.around.filter((c) =>
    c.sources.some((s) => /record-eagle/i.test(s.name)),
  ).length <= 2,
  "Record-Eagle homepage bay cap stays 2",
);

function countEyesOnly(
  around: Array<{ sources: Array<string | { name: string }> }>,
): number {
  return around.filter((c) =>
    c.sources.some((s) => {
      const name = typeof s === "string" ? s : s.name;
      return /^(The Ticker|Northern Express|Traverse City Business News)$/i.test(
        name,
      );
    }),
  ).length;
}
assert.ok(
  countEyesOnly(edition.around) <= 2,
  `Eyes Only Media edition bay family cap stays 2, got ${countEyesOnly(edition.around)}`,
);
assert.ok(
  countEyesOnly(home.around) <= 2,
  `Eyes Only Media homepage bay family cap stays 2, got ${countEyesOnly(home.around)}`,
);

// Thin pool: only two fresh wire items → shorter bay, never pad with yesterday.
const thinData = {
  ...data,
  stories: [
    ...STALE_HEADS.map((h, i) =>
      story({
        id: `thin_stale_${i}`,
        title: h.title,
        url: h.url,
        source_id: h.source_id,
        published_at: "2026-08-25T15:00:00.000Z",
      }),
    ),
    story({
      id: "thin_fresh_1",
      title: FRESH[0].title,
      url: FRESH[0].url,
      source_id: "src_910",
      published_at: "2026-08-26T09:00:00.000Z",
    }),
    story({
      id: "thin_fresh_2",
      title: FRESH[1].title,
      url: FRESH[1].url,
      source_id: "src_ipr",
      published_at: "2026-08-26T08:00:00.000Z",
    }),
  ],
} as unknown as AppData;

const thinEdition = buildEditionSnapshot(thinData, wednesday);
assertNoStaleHeads(thinEdition.around, "thin edition");
assert.ok(
  thinEdition.around.length < BAY_AROUND_MIN_FRESH,
  "thin fresh pool stays short — do not pad with yesterday’s heads",
);
assert.equal(thinEdition.around.length, 2);

// After a full yesterday, one-shot cards from older days (not on yesterday)
// must still fill today’s bay — do not ban the whole edition archive.
const mondayOnly = {
  title: "Monday harbor dredging award announced",
  url: "https://www.interlochenpublicradio.org/2026/08/24/monday-harbor-dredging/",
  source_id: "src_ipr",
} as const;
const tuesdayOnly = {
  title: "Tuesday trail bridge inspection wraps",
  url: "https://www.northernexpress.com/2026/08/25/trail-bridge/",
  source_id: "src_northern",
} as const;
const boardman910 = {
  title:
    "Grand Traverse County Health Department continues Level 2 advisory near source of sewage spill",
  url: "https://www.9and10news.com/2026/08/27/boardman-sewage-advisory/",
  source_id: "src_910",
} as const;
const boardmanTicker = {
  title: "No Body Contact Advisory Issued for Boardman River/Lake",
  url: "https://traverseticker.com/news/no-body-contact-advisory-issued-for-boardman-riverlake/",
  source_id: "src_ticker",
} as const;

const fridayEdition: EditionSnapshot = {
  date: "2026-08-28",
  captured_at: "2026-08-28T12:00:00.000Z",
  lead: {
    title: "Staff original on the bay shoreline",
    dek: "Owned lead.",
    url: "https://traverse.news/story/staff-shoreline",
    published_at: "2026-08-25T11:00:00.000Z",
    sources: ["traverse.news"],
    byline: "By traverse.news",
    slug: "staff-shoreline",
    is_original: true,
  },
  around: STALE_HEADS.map((h) =>
    bayCard(
      h.title,
      h.url,
      sources.find((s) => s.id === h.source_id)?.name ?? "Wire",
      "2026-08-28",
    ),
  ),
  events: [],
  civic: [],
};

const mondayEdition: EditionSnapshot = {
  date: "2026-08-24",
  captured_at: "2026-08-24T12:00:00.000Z",
  lead: null,
  around: [
    bayCard(
      mondayOnly.title,
      mondayOnly.url,
      "Interlochen Public Radio",
      "2026-08-24",
    ),
  ],
  events: [],
  civic: [],
};

const tuesdayEdition: EditionSnapshot = {
  date: "2026-08-25",
  captured_at: "2026-08-25T12:00:00.000Z",
  lead: null,
  around: [
    bayCard(
      tuesdayOnly.title,
      tuesdayOnly.url,
      "Northern Express",
      "2026-08-25",
    ),
  ],
  events: [],
  civic: [],
};

const saturdayFillStories: Story[] = [
  ...STALE_HEADS.map((h, i) =>
    story({
      id: `sat_stale_${i}`,
      title: h.title,
      url: h.url,
      source_id: h.source_id,
      published_at: "2026-08-28T15:00:00.000Z",
    }),
  ),
  story({
    id: "sat_monday",
    title: mondayOnly.title,
    url: mondayOnly.url,
    source_id: mondayOnly.source_id,
    published_at: "2026-08-24T14:00:00.000Z",
  }),
  story({
    id: "sat_tuesday",
    title: tuesdayOnly.title,
    url: tuesdayOnly.url,
    source_id: tuesdayOnly.source_id,
    published_at: "2026-08-25T14:00:00.000Z",
  }),
  ...FRESH.map((h, i) =>
    story({
      id: `sat_fresh_${i}`,
      title: h.title,
      url: h.url,
      source_id: h.source_id,
      published_at: `2026-08-29T0${Math.min(9, i)}:00:00.000Z`,
    }),
  ),
  story({
    id: "sat_boardman_910",
    title: boardman910.title,
    url: boardman910.url,
    source_id: boardman910.source_id,
    published_at: "2026-08-27T16:00:00.000Z",
  }),
  story({
    id: "sat_boardman_ticker",
    title: boardmanTicker.title,
    url: boardmanTicker.url,
    source_id: boardmanTicker.source_id,
    published_at: "2026-08-26T16:00:00.000Z",
  }),
  story({
    id: "sat_original",
    title: "Staff original on the bay shoreline",
    url: "https://traverse.news/story/staff-shoreline",
    source_id: "src_ticker",
    published_at: "2026-08-25T11:00:00.000Z",
    is_original: true,
    byline: "By traverse.news",
    slug: "staff-shoreline",
  }),
];

const saturdayData = {
  ...data,
  stories: saturdayFillStories,
  editions: [fridayEdition, mondayEdition, tuesdayEdition, oldLeftoverEdition],
} as unknown as AppData;

const saturday = new Date("2026-08-29T16:00:00.000Z");
const saturdayEdition = buildEditionSnapshot(saturdayData, saturday);
assertNoStaleHeads(saturdayEdition.around, "saturday after full friday");
assert.ok(
  saturdayEdition.around.some((c) => c.url === mondayOnly.url),
  "Monday one-shot leftover must be eligible on Saturday",
);
assert.ok(
  saturdayEdition.around.some((c) => c.url === tuesdayOnly.url),
  "Tuesday one-shot leftover must be eligible on Saturday",
);
assert.ok(
  saturdayEdition.around.length >= BAY_AROUND_MIN_FRESH,
  `Saturday bay should reach soft minimum when unused stories exist (got ${saturdayEdition.around.length})`,
);
const boardmanOnBay = saturdayEdition.around.filter(
  (c) =>
    c.url === boardman910.url ||
    c.url === boardmanTicker.url,
);
assert.ok(
  boardmanOnBay.length <= 1,
  `Boardman sewage spill must be one card, got ${boardmanOnBay.length}`,
);
assert.ok(
  saturdayEdition.around.some(
    (c) => c.url === "https://www.traverseticker.com/news/boardman-river-cleanup/",
  ),
  "unrelated Boardman cleanup must stay distinct from sewage advisory",
);

const tickerCount = saturdayEdition.around.filter((c) =>
  c.sources.some((s) => /ticker/i.test(s)),
).length;
const nineCount = saturdayEdition.around.filter((c) =>
  c.sources.some((s) => /9\s*&\s*10/i.test(s)),
).length;
assert.ok(
  tickerCount <= 2,
  `Ticker heavy-wire bay cap is 2 (got ${tickerCount})`,
);
assert.ok(
  nineCount <= 2,
  `9&10 News heavy-wire bay cap is 2 (got ${nineCount})`,
);
assert.ok(
  saturdayEdition.around.some((c) =>
    c.sources.some((s) => /Interlochen|Northern Express|Betsie/i.test(s)),
  ),
  "Saturday bay should surface smaller preferred desks when unused stories exist",
);

console.log(
  `dry-run-bay-fresh: ok (edition around=${edition.around.length}, home around=${home.around.length}, thin=${thinEdition.around.length}, saturday=${saturdayEdition.around.length})`,
);
