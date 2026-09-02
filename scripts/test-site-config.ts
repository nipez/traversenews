/**
 * SiteConfig + city seed isolation.
 * Run: npm run test:site-config
 */
import { createSeedData } from "../src/lib/data/seed";
import { resetSeedCatalog } from "../src/lib/data/store";
import { buildSchoolsSnapshot } from "../src/lib/public-snapshots";
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
assert(getSite().weather?.gridId === "APX", "TC weather is NWS APX");
assert(getSite().weather?.gridX === 29 && getSite().weather?.gridY === 46, "TC grid 29,46");
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
assert(getSite().reservedPlaces.includes("Ypsilanti"), "Ypsilanti reserved");
assert(getSite().reservedPlaces.includes("Saline"), "Saline reserved");
assert(getSite().reservedPlaces.includes("Chelsea"), "Chelsea reserved");
assert(
  getSite().regionPhrase.includes("Washtenaw"),
  "AA region is Washtenaw County",
);
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
  aa.sources.some((s) => s.id === "src_saline_summit" && s.place === "Saline"),
  "AA seed has Saline Summit",
);
assert(
  aa.sources.some((s) => s.id === "src_ypsi_news" && s.family === "official"),
  "AA seed has City of Ypsilanti official news",
);
assert(
  aa.sources.some((s) => s.id === "src_saline_news" && s.family === "official"),
  "AA seed has City of Saline official news",
);
assert(
  aa.sources.some((s) => s.id === "src_chelsea_news" && s.family === "official"),
  "AA seed has City of Chelsea official news",
);
assert(
  aa.sources.some((s) => s.id === "src_ycs_cal" && s.lane === "school_cal"),
  "AA seed has YCS calendar",
);
assert(isSchoolCalSource(undefined, "src_ycs_cal"), "YCS calendar lane");
assert(isSchoolCalSource(undefined, "src_saline_cal"), "Saline calendar lane");
assert(isSchoolCalSource(undefined, "src_chelsea_cal"), "Chelsea calendar lane");
assert(
  aa.sources.some((s) => s.id === "src_ark_events" && s.lane === "events"),
  "AA seed has Ark events (not shows id)",
);
assert(
  aa.sources.some((s) => s.id === "src_ums_events" && s.lane === "events"),
  "AA seed has UMS season listing",
);
assert(
  aa.sources.some((s) => s.id === "src_marquee_shows" && s.lane === "shows"),
  "AA seed has Marquee film showtimes",
);
assert(
  aa.sources.some((s) => s.id === "src_marquee_events" && s.lane === "events"),
  "AA seed has Marquee live events",
);
assert(
  aa.sources.some((s) => s.id === "src_a2_news" && s.family === "official"),
  "AA city news is official family",
);
const dexter = aa.sources.find((s) => s.id === "src_dexter_cal");
assert(
  dexter?.homepage?.includes("dexterschools.org"),
  "Dexter calendar is dexterschools.org, not Utah dcsd.org",
);
assert(dexter?.pull_method === "ics", "Dexter calendar is Finalsite ICS");
assert(
  dexter?.feed_url?.includes("calendar-manager/events.ics"),
  "Dexter calendar uses the public Finalsite ICS feed",
);
assert(
  aa.sources.find((s) => s.id === "src_aadl_events")?.feed_url?.includes(
    "events-feed/upcoming",
  ),
  "AADL uses the Drupal upcoming feed",
);
assert(
  aa.sources
    .find((s) => s.id === "src_washtenaw_calendar")
    ?.feed_url?.includes("civicclerk.com"),
  "Washtenaw civic uses CivicClerk OData",
);
assert(
  getSite().eventsHandoffs.some((l) => l.href.includes("annarbor.org")),
  "AA events handoffs include Visit AA",
);
assert(
  getSite().civicHandoffs.some((l) => l.href.includes("legistar")),
  "AA civic handoffs include Legistar",
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

const emptySchools = buildSchoolsSnapshot(aa);
const emptyNames = emptySchools.districts.map((d) => d.district);
assert(
  ["AAPS", "Ypsilanti", "Saline", "Chelsea", "Dexter"].every((name) =>
    emptyNames.includes(name),
  ),
  "AA /schools lists every Washtenaw district before dates are imported",
);
assert(
  emptySchools.districts.find((d) => d.district === "Ypsilanti")
    ?.calendarUrl?.includes("ycschools.us"),
  "Ypsilanti empty tab still links Full calendar",
);
assert(
  emptySchools.districts.find((d) => d.district === "Saline")
    ?.calendarUrl?.includes("salineschools.org"),
  "Saline empty tab still links Full calendar",
);
assert(
  emptySchools.districts.find((d) => d.district === "Chelsea")
    ?.calendarUrl?.includes("chelseaschools.org"),
  "Chelsea empty tab still links Full calendar",
);

setSite("traverse");
const tcSchools = buildSchoolsSnapshot(tc);
assert(
  tcSchools.districts.length === 0,
  "Traverse /schools still hides empty districts",
);

console.log("test-site-config: ok");
