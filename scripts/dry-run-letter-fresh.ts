/**
 * Dry-run: morning letter must drop yesterday’s bay/lead/alert cards by URL
 * or headline, and must not pad with stale heads when the fresh pool is thin.
 *
 *   npx tsx scripts/dry-run-letter-fresh.ts
 */
import assert from "node:assert/strict";
import {
  buildEmailEditionSnapshot,
  collectPriorLetterIdentities,
  LETTER_AROUND_MIN_FRESH,
  pickFreshAroundForLetter,
  wasInPriorLetter,
} from "../src/lib/email-editions";
import type {
  AppData,
  EmailEditionSnapshot,
  Source,
  Story,
} from "../src/lib/types";

const STALE_URL =
  "https://www.traverseticker.com/news/deputy-city-manager-example/";
const STALE_TITLE = "Deputy City Manager search advances";
const FRESH_URL = "https://www.9and10news.com/2026/08/26/new-bay-story/";
const FRESH_TITLE = "Harbor Commission sets fall dock fees";

const yesterdayLetter: EmailEditionSnapshot = {
  date: "2026-08-25",
  captured_at: "2026-08-25T12:00:00.000Z",
  lead: null,
  around: [
    {
      title: STALE_TITLE,
      dek: "City hall.",
      url: STALE_URL,
      sources: ["The Ticker"],
    },
    {
      title: "Brown Bridge Quiet Area trail work",
      dek: "Parks.",
      url: "https://www.record-eagle.com/brown-bridge",
      sources: ["Record-Eagle"],
      paywalled: true,
    },
  ],
  alerts: [
    {
      title: "US 31 crash near Acme",
      dek: "Lanes blocked.",
      url: "https://www.gt911.org/alert-1",
      source_name: "Grand Traverse 911",
    },
  ],
  tonight: [],
  civic: [
    {
      title: "City Commission",
      starts_at: "2026-08-26T23:00:00.000Z",
      place: "City Hall",
      url: "https://www.traversecitymi.gov/meeting-1",
    },
  ],
  sports: [],
};

const prior = collectPriorLetterIdentities(yesterdayLetter);
assert.equal(wasInPriorLetter({ title: STALE_TITLE, url: STALE_URL }, prior), true);
assert.equal(
  wasInPriorLetter({ title: STALE_TITLE, url: "https://other.example/x" }, prior),
  true,
  "same headline still counts as prior even on a new URL",
);
assert.equal(
  wasInPriorLetter({ title: FRESH_TITLE, url: FRESH_URL }, prior),
  false,
);

const picked = pickFreshAroundForLetter(
  [
    { title: STALE_TITLE, url: STALE_URL },
    { title: FRESH_TITLE, url: FRESH_URL },
    {
      title: "Brown Bridge Quiet Area trail work",
      url: "https://www.record-eagle.com/brown-bridge",
    },
    {
      title: "Only three fresh after drops",
      url: "https://www.interlochenpublicradio.org/a",
    },
  ],
  prior,
  6,
);
assert.deepEqual(
  picked.map((p) => p.url),
  [
    FRESH_URL,
    "https://www.interlochenpublicradio.org/a",
  ],
);
assert.ok(
  picked.length < LETTER_AROUND_MIN_FRESH,
  "thin fresh pool stays short — do not pad",
);

const sourceTicker: Source = {
  id: "src_ticker",
  name: "The Ticker",
  beat_id: "beat_news",
  homepage: "https://www.traverseticker.com",
  feed_url: null,
  pull_method: "rss",
  enabled: true,
  notes: "",
};
const source910: Source = {
  id: "src_910",
  name: "9&10 News",
  beat_id: "beat_news",
  homepage: "https://www.9and10news.com",
  feed_url: null,
  pull_method: "rss",
  enabled: true,
  notes: "",
};

function story(partial: Partial<Story> & Pick<Story, "id" | "title" | "url" | "source_id">): Story {
  return {
    dek: partial.dek ?? "",
    published_at: partial.published_at ?? "2026-08-26T10:00:00.000Z",
    is_original: false,
    byline: null,
    slug: null,
    image_url: null,
    body: null,
    ...partial,
  };
}

const data = {
  beats: [],
  sources: [sourceTicker, source910],
  stories: [
    story({
      id: "s1",
      title: STALE_TITLE,
      url: STALE_URL,
      source_id: "src_ticker",
      dek: "Stale bay head from yesterday.",
      published_at: "2026-08-24T15:00:00.000Z",
    }),
    story({
      id: "s2",
      title: FRESH_TITLE,
      url: FRESH_URL,
      source_id: "src_910",
      dek: "New fee schedule for municipal docks this fall.",
      published_at: "2026-08-26T09:00:00.000Z",
    }),
    story({
      id: "s3",
      title: "Only three fresh after drops",
      url: "https://www.interlochenpublicradio.org/a",
      source_id: "src_910",
      dek: "Second fresh wire item for the morning letter.",
      published_at: "2026-08-26T08:00:00.000Z",
    }),
  ],
  events: [],
  athletics: [],
  schools: [],
  subscribers: [],
  tips: [],
  event_tips: [],
  last_pull_at: null,
  editions: [],
  email_editions: [yesterdayLetter],
  drafts: [],
} as unknown as AppData;

const monday = new Date("2026-08-26T12:00:00.000Z");
const letter = buildEmailEditionSnapshot(data, monday);

assert.equal(letter.date, "2026-08-26");
assert.ok(
  letter.around.every((c) => c.url !== STALE_URL),
  "yesterday URL must not reappear",
);
assert.ok(
  letter.around.every((c) => c.title !== STALE_TITLE),
  "yesterday headline must not reappear",
);
assert.ok(
  letter.around.some((c) => c.url === FRESH_URL),
  "fresh bay card should ship",
);
assert.ok(
  letter.civic.every((c) => c.title !== "City Commission"),
  "identical civic from yesterday is skipped",
);
assert.ok(
  letter.alerts.every((c) => !c.url.includes("alert-1")),
  "identical alert from yesterday is skipped",
);

console.log(
  `dry-run-letter-fresh: ok (around=${letter.around.length}, skipped stale bay heads)`,
);
