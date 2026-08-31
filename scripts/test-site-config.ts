/**
 * SiteConfig + city seed isolation.
 * Run: npm run test:site-config
 */
import { createSeedData } from "../src/lib/data/seed";
import { resetSeedCatalog } from "../src/lib/data/store";
import {
  getSite,
  resetSiteCache,
  siteWordmark,
} from "../src/lib/sites";
import { isAlertSource, isSchoolCalSource } from "../src/lib/source-lanes";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

function setSite(id: string) {
  process.env.SITE_ID = id;
  process.env.NEXT_PUBLIC_SITE_ID = id;
  resetSiteCache();
  resetSeedCatalog();
}

setSite("traverse");
assert(getSite().id === "traverse", "default site is traverse");
assert(siteWordmark() === "traverse.news", "TC wordmark");
assert(getSite().aroundLabel === "Around the bay", "TC around label");
assert(getSite().letterPreviewOnly === false, "TC letter is not preview-only");
const tc = createSeedData();
assert(
  tc.sources.some((s) => s.id === "src_ticker"),
  "TC seed has Ticker",
);
assert(
  !tc.sources.some((s) => s.id === "src_michigandaily"),
  "TC seed has no Michigan Daily",
);
const ticker = tc.sources.find((s) => s.id === "src_ticker");
assert(ticker?.lane === "wire", "Ticker has lane wire");
assert(ticker?.family === "eyes-only", "Ticker is eyes-only family");
assert(isAlertSource(undefined, "src_gt911"), "TC alert fallback");

setSite("ann-arbor");
assert(getSite().id === "ann-arbor", "AA site id");
assert(siteWordmark() === "a2.news", "AA wordmark");
assert(getSite().aroundLabel === "Around town", "AA around label");
assert(getSite().letterPreviewOnly === true, "AA letter is preview-only");
assert(getSite().reservedPlaces.includes("Dexter"), "Dexter reserved");
const aa = createSeedData();
assert(
  aa.sources.some((s) => s.id === "src_michigandaily"),
  "AA seed has Michigan Daily",
);
assert(
  aa.sources.some((s) => s.id === "src_suntimes" && s.place === "Dexter"),
  "AA seed has Dexter Sun Times",
);
assert(
  !aa.sources.some((s) => s.id === "src_ticker"),
  "AA seed must not include Traverse Ticker",
);
assert(
  aa.stories.length === 0 && aa.events.length === 0,
  "AA seed invents no stories or events",
);
assert(isSchoolCalSource(undefined, "src_aaps_cal"), "AAPS calendar lane");
assert(isAlertSource(undefined, "src_a2_police_news"), "AA police alert lane");

const dailySports = aa.sources.find((s) => s.id === "src_michigandaily_sports");
assert(!dailySports, "Do not seed U-M sports firehose");

console.log("test-site-config: ok");
