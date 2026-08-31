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
import { schoolItemsFromEvents } from "../src/lib/schools";
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
assert(
  getSite().pageCopy.comingUpDek.includes("around the bay"),
  "TC coming-up dek keeps the bay",
);
assert(
  getSite().pageCopy.letterGreetingLead.includes("the bay"),
  "TC letter greeting keeps the bay",
);
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
assert(
  !getSite().pageCopy.comingUpDek.includes("bay"),
  "AA coming-up dek must not say bay",
);
assert(
  getSite().pageCopy.comingUpDek.includes("around town"),
  "AA coming-up dek says around town",
);
assert(
  !getSite().pageCopy.letterGreetingLead.includes("bay"),
  "AA letter greeting must not say bay",
);
assert(
  !getSite().pageCopy.showsDek.includes("bay"),
  "AA shows dek must not say bay",
);
assert(
  !getSite().pageCopy.sportsDek.includes("9&10"),
  "AA sports dek is not Traverse desks",
);
assert(
  getSite().sportsBeatLinks.some((l) => l.href.includes("pioneerathletics")),
  "AA sports rail is HS athletics",
);
assert(
  !getSite().showsVenueLinks.some((l) => l.href.includes("oldtownplayhouse")),
  "AA shows rail is not Traverse venues",
);
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

const schoolFromIcs = schoolItemsFromEvents([
  {
    id: "evt_test",
    title: "Labor Day — No School",
    starts_at: "2026-09-07T04:00:00.000Z",
    place: "AAPS",
    url: "https://www.a2schools.org/",
    source_id: "src_aaps_cal",
  },
  {
    id: "evt_pta",
    title: "PTO Ice Cream Social",
    starts_at: "2026-09-08T22:00:00.000Z",
    place: "AAPS",
    url: null,
    source_id: "src_aaps_cal",
  },
]);
assert(
  schoolFromIcs.length === 1 && schoolFromIcs[0].district === "AAPS",
  "AAPS ICS important dates land on /schools",
);

console.log("test-site-config: ok");
