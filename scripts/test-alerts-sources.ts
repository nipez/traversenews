/**
 * Alert allowlist + Around-the-bay exclusion + FB agency inference.
 * Run: npx tsx scripts/test-alerts-sources.ts
 */
import assert from "node:assert/strict";
import {
  ALERT_SOURCE_IDS,
  inferAlertSourceIdFromUrl,
  isAlertSourceId,
  resolveAlertSourceId,
  selectAlerts,
  TRAVERSE_ALERT_SOURCES,
} from "../src/lib/alerts";
import { selectAroundTheBay } from "../src/lib/around";
import { createSeedData } from "../src/lib/data/seed";
import { resetSeedCatalog } from "../src/lib/data/store";
import { normalizeImportedStories } from "../src/lib/desk/import-stories";
import { clusterStories } from "../src/lib/pull/cluster";
import { resetSiteCache } from "../src/lib/sites";
import { isAlertSource } from "../src/lib/source-lanes";
import type { ClusteredStory, Story } from "../src/lib/types";

process.env.SITE_ID = "traverse";
process.env.NEXT_PUBLIC_SITE_ID = "traverse";
resetSiteCache();
resetSeedCatalog();

const seed = createSeedData();

const EXPECTED_IDS = [
  "src_gt911",
  "src_gtcrc",
  "src_bata_fb",
  "src_bata",
  "src_ticker_fb",
] as const;

for (const id of EXPECTED_IDS) {
  assert.equal(
    ALERT_SOURCE_IDS.has(id),
    true,
    `ALERT_SOURCE_IDS must include ${id}`,
  );
  assert.equal(
    isAlertSourceId(id),
    true,
    `isAlertSourceId(${id}) without sources (bay-pill path)`,
  );
  assert.equal(
    isAlertSource(undefined, id),
    true,
    `FALLBACK_ALERT / lane for ${id}`,
  );
}

assert.ok(
  seed.sources.some((s) => s.id === "src_gtcrc" && s.lane === "alert"),
  "seed has src_gtcrc with lane alert",
);
assert.ok(
  seed.sources.some((s) => s.id === "src_bata_fb" && s.lane === "alert"),
  "seed has src_bata_fb with lane alert",
);

for (const row of TRAVERSE_ALERT_SOURCES) {
  assert.equal(
    ALERT_SOURCE_IDS.has(row.id),
    true,
    `picker ${row.id} is on allowlist`,
  );
}

// Agency URL inference
assert.equal(
  inferAlertSourceIdFromUrl(
    "https://www.facebook.com/batatransit/posts/pfbidExample",
  ),
  "src_bata_fb",
);
assert.equal(
  inferAlertSourceIdFromUrl(
    "https://www.facebook.com/profile.php?id=100064583803947&story_fbid=1",
  ),
  "src_gtcrc",
);
assert.equal(
  inferAlertSourceIdFromUrl(
    "https://www.facebook.com/p/Grand-Traverse-County-Road-Commission-100064583803947/posts/1",
  ),
  "src_gtcrc",
);
assert.equal(
  inferAlertSourceIdFromUrl(
    "https://www.facebook.com/GrandTraverse911/posts/pfbidExample",
  ),
  "src_gt911",
);
assert.equal(
  inferAlertSourceIdFromUrl(
    "https://www.facebook.com/TraverseCityTicker/posts/pfbidExample",
  ),
  "src_ticker_fb",
);
assert.equal(
  inferAlertSourceIdFromUrl("https://www.traverseticker.com/news/crash/"),
  null,
);

// Prefer agency over a Ticker default on import
assert.equal(
  resolveAlertSourceId(
    "https://www.facebook.com/batatransit/posts/1",
    "src_ticker_fb",
  ),
  "src_bata_fb",
);

const imported = normalizeImportedStories(
  [
    {
      title: "Labor Day limited LINK",
      url: "https://www.facebook.com/batatransit/posts/pfbidLaborDay",
      source_id: "src_ticker_fb",
    },
    {
      title: "Hammond Rd closed",
      url: "https://www.facebook.com/profile.php?id=100064583803947",
      source_id: "src_ticker_fb",
    },
  ],
  seed.sources,
  "src_ticker_fb",
);
assert.equal(imported.imported.length, 2);
assert.equal(imported.imported[0]?.source_id, "src_bata_fb");
assert.equal(imported.imported[1]?.source_id, "src_gtcrc");
assert.deepEqual(new Set(imported.source_ids), new Set(["src_bata_fb", "src_gtcrc"]));

// Strip credits agency names
const now = new Date().toISOString();
const alertStories: Story[] = [
  {
    id: "story_bata",
    source_id: "src_bata_fb",
    title: "Bayline 30-minute frequency",
    dek: "",
    url: "https://www.facebook.com/batatransit/posts/1",
    published_at: now,
    is_original: false,
    body: null,
    image_url: null,
    byline: null,
    slug: null,
  },
  {
    id: "story_gtcrc",
    source_id: "src_gtcrc",
    title: "Three Mile closed",
    dek: "",
    url: "https://www.facebook.com/profile.php?id=100064583803947",
    published_at: now,
    is_original: false,
    body: null,
    image_url: null,
    byline: null,
    slug: null,
  },
];
const strip = selectAlerts(alertStories, seed.sources, { limit: 3 });
assert.equal(strip.length, 2);
assert.ok(
  strip.some((a) => a.source_name === "BATA"),
  "strip credits BATA not Ticker",
);
assert.ok(
  strip.some((a) => a.source_name === "GTCRC"),
  "strip credits GTCRC",
);

// Around the bay must drop allowlisted alert source ids (cluster pills have no lane)
const wire: Story = {
  id: "story_wire",
  source_id: "src_ipr",
  title: "City hall budget hearing next week",
  dek: "Council will take public comment.",
  url: "https://www.interlochenpublicradio.org/local/budget-hearing",
  published_at: now,
  is_original: false,
  body: null,
  image_url: null,
  byline: null,
  slug: null,
};
const clusters = clusterStories([...alertStories, wire], seed.sources);
const bay = selectAroundTheBay(clusters, { limit: 18, now: new Date(now) });
assert.ok(
  !bay.some((c: ClusteredStory) =>
    c.sources.some((s) => ALERT_SOURCE_IDS.has(s.id)),
  ),
  "no alert-allowlist source may appear as a bay card",
);
assert.ok(
  bay.some((c) => c.sources.some((s) => s.id === "src_ipr")),
  "ordinary wire still eligible for bay",
);

console.log("test-alerts-sources: ok");
