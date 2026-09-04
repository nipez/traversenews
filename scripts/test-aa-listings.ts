/**
 * AA listing parsers + Around-town U-M varsity filter.
 * Run: npm run test:aa-listings
 */
import assert from "node:assert/strict";
import {
  looksLikeUmVarsity,
  reservedPlaceForCluster,
  selectAroundTheBay,
} from "../src/lib/around";
import {
  collectArkEventLinks,
  extractA2GovNews,
  extractTheRideNews,
  extractAadlEvents,
  extractArkEventFromPage,
  extractCivicClerkMeetings,
  extractEncoreShowsFromTribe,
  extractLegistarMeetings,
  extractMarqueeLiveEvents,
  extractMarqueeShows,
  extractUmsListingEvents,
  showListingFromEvent,
} from "../src/lib/pull/html-ann-arbor";
import { looksLikeWashtenawPrep } from "../src/lib/sports";
import { eventsFromIcsText } from "../src/lib/pull/ics";
import { extractEventLinkGames, parseEventLinkWhen } from "../src/lib/pull/html-athletics";
import { resetSiteCache } from "../src/lib/sites";
import type { ClusteredStory, Source } from "../src/lib/types";

const now = new Date("2026-08-31T16:00:00.000Z");

const civicSrc: Source = {
  id: "src_a2_legistar",
  name: "City of Ann Arbor — Boards & Commissions",
  homepage: "https://www.a2gov.org/",
  feed_url: "https://a2gov.legistar.com/Calendar.aspx",
  pull_method: "html",
  beat_id: "beat_government",
  enabled: true,
  notes: "",
  lane: "civic",
};

const arkSrc: Source = {
  id: "src_ark_events",
  name: "The Ark — Events",
  homepage: "https://theark.org/",
  feed_url: "https://theark.org/events/",
  pull_method: "html",
  beat_id: "beat_events",
  enabled: true,
  notes: "",
  lane: "events",
};

const umsSrc: Source = {
  id: "src_ums_events",
  name: "UMS — Season",
  homepage: "https://ums.org/",
  feed_url: "https://ums.org/season/",
  pull_method: "html",
  beat_id: "beat_events",
  enabled: true,
  notes: "",
  lane: "events",
};

const legistarHtml = `
<table><tbody>
<tr class="rgRow" valign="top">
  <td><a id="x_hypBody">City Council</a></td>
  <td class="rgSorted">8/31/2026</td>
  <td></td>
  <td><span id="x_lblTime">7:00 PM</span></td>
  <td>Larcom City Hall, 301 E Huron St<br /><em>Regular. Zoom notes</em></td>
  <td><a id="x_hypMeetingDetail" href="MeetingDetail.aspx?ID=1368517&amp;GUID=ABC&amp;Options=info|&amp;Search=">Meeting details</a></td>
</tr>
<tr class="rgAltRow" valign="top">
  <td><a id="y_hypBody">Housing Commission</a></td>
  <td class="rgSorted">8/1/2026</td>
  <td></td>
  <td><span id="y_lblTime">6:00 PM</span></td>
  <td>City Hall</td>
  <td><a id="y_hypMeetingDetail" href="MeetingDetail.aspx?ID=1">Meeting details</a></td>
</tr>
<tr class="rgRow" valign="top">
  <td><a id="z_hypBody">Planning Commission</a></td>
  <td class="rgSorted">9/17/2026</td>
  <td></td>
  <td><span id="z_lblTime"></span></td>
  <td>Larcom City Hall</td>
  <td><a id="z_hypMeetingDetail" href="MeetingDetail.aspx?ID=99">Meeting details</a></td>
</tr>
</tbody></table>
`;

const civic = extractLegistarMeetings(legistarHtml, civicSrc, now);
assert.equal(civic.length, 2, "past Housing Commission dropped");
const council = civic.find((e) => e.title === "City Council");
assert.ok(council, "City Council row");
assert.equal(council!.time_unknown, undefined, "printed 7:00 PM is not unknown");
assert.equal(council!.place, "Larcom City Hall, 301 E Huron St");
assert.ok(
  council!.url?.includes("MeetingDetail.aspx?ID=1368517"),
  "absolute Legistar detail URL",
);
assert.notEqual(
  new Date(council!.starts_at).getUTCHours() === 12 &&
    new Date(council!.starts_at).getUTCMinutes() === 0,
  true,
);
const planning = civic.find((e) => e.title === "Planning Commission");
assert.equal(planning?.time_unknown, true, "empty clock → time_unknown");
assert.ok(
  planning && new Date(planning.starts_at).getUTCHours() !== 16,
  "date-only must not be noon Detroit (16:00 UTC in EDT)",
);

const arkPage = `
<h1>The Brudi Brothers</h1>
<span class="tribe-event-date-start">August 31 @ 8:00 pm</span>
<abbr class="dtstart" title="2026-08-31"> August 31 2026 </abbr>
<dt class="tribe-events-start-time-label"> Show Starts: </dt>
<dd>8:00 pm</dd>
<div class="tribe-venue">The Ark</div>
<span class="tribe-event-date-start">September 16 @ 8:00 pm</span>
`;
const ark = extractArkEventFromPage(
  arkPage,
  "https://theark.org/event/the-brudi-brothers-260831/",
  arkSrc,
  now,
);
assert.ok(ark, "Ark page with printed clock");
assert.equal(ark!.title, "The Brudi Brothers");
assert.equal(ark!.place, "The Ark");
assert.equal(ark!.time_unknown, undefined);
assert.equal(
  ark!.starts_at,
  "2026-09-01T00:00:00.000Z",
  "8:00 pm Detroit Aug 31 2026",
);

const arkDateOnly = extractArkEventFromPage(
  `<h1>Open Stage</h1><span class="tribe-event-date-start">September 2</span><abbr class="dtstart" title="2026-09-02">September 2 2026</abbr>`,
  "https://theark.org/event/open-stage/",
  arkSrc,
  now,
);
assert.equal(arkDateOnly?.time_unknown, true, "no printed clock → unknown");

const arkLinks = collectArkEventLinks(`
  <a href="https://theark.org/event/the-brudi-brothers-260831/">x</a>
  <link>https://theark.org/event/the-arks-open-stage-260902/</link>
`);
assert.ok(arkLinks.includes("https://theark.org/event/the-brudi-brothers-260831/"));
assert.ok(arkLinks.includes("https://theark.org/event/the-arks-open-stage-260902/"));

const umsHtml = `
<div class="event_block clearfix" id="eb_1">
  <a href="https://ums.org/performance/square-dancing/"><h3><p>Square Dancing at the Freighthouse<br /><span>with Detroit Square Dance Society</span></p></h3></a>
  Thursday, September 10, 2026
  <div class="pill_cat">Participatory Experience</div>
  <div class="pill_cat">Ypsi Freighthouse</div>
</div>
<div class="event_block clearfix" id="eb_2">
  <h3>No date here</h3>
</div>
`;
const ums = extractUmsListingEvents(umsHtml, umsSrc, now);
assert.equal(ums.length, 1);
assert.equal(ums[0].time_unknown, true);
assert.equal(ums[0].place, "Ypsi Freighthouse");
assert.match(ums[0].title, /Square Dancing/);
assert.equal(
  ums[0].starts_at,
  "2026-09-10T04:00:00.000Z",
  "date-only midnight Detroit, not noon",
);

assert.equal(
  looksLikeUmVarsity({
    title: "SportsMonday: Wolverines look ahead",
    url: "https://www.michigandaily.com/sports/football/recap/",
  }),
  true,
);
assert.equal(
  looksLikeUmVarsity({
    title: "Michigan Democrats meet in Ann Arbor",
    url: "https://www.michigandaily.com/news/politics/",
  }),
  false,
);

const marqueeSrc: Source = {
  id: "src_marquee_events",
  name: "Marquee Arts — Live",
  homepage: "https://marquee-arts.org/",
  feed_url: "https://marquee-arts.org/",
  pull_method: "html",
  beat_id: "beat_events",
  enabled: true,
  notes: "",
  lane: "events",
};
const marqueeShowsSrc: Source = {
  ...marqueeSrc,
  id: "src_marquee_shows",
  name: "Marquee Arts — Films",
  beat_id: "beat_shows",
  lane: "shows",
};
const marqueeHtml = `
<ul>
<li class="splide__slide now-showing-item"><div>
<h3 class="h4-size">Beth Hart</h3>
<div class="event-archive-desc">Tuesday, September 15 at 8:00 PM | Main Auditorium<br>$57</div>
<a href="https://www.ticketmaster.com/event/080064950D7A502C">See Details</a>
</div></li>
<li class="splide__slide now-showing-item"><div>
<h3 class="h4-size">The Piano</h3>
<div class="event-archive-desc">Tuesday, September 1 at 7:00 PM | Michigan<br><br>Film | Romance/Drama | R</div>
<a href="/event-page/?showingId=1025799&eventId=160470">See Details</a>
</div></li>
<li class="splide__slide now-showing-item"><div>
<h3 class="h4-size">The Big Cheese</h3>
<div class="event-archive-desc">Now Playing | Michigan<br><br>Film | Documentary</div>
<a href="/event-page/?showingId=1&eventId=1">See Details</a>
</div></li>
</ul>
`;
const live = extractMarqueeLiveEvents(marqueeHtml, marqueeSrc, now);
assert.equal(live.length, 1, "films stay off live events");
assert.equal(live[0].title, "Beth Hart");
assert.equal(live[0].starts_at, "2026-09-16T00:00:00.000Z");
assert.equal(live[0].place, "Michigan Theater");
const films = extractMarqueeShows(marqueeHtml, marqueeShowsSrc, now);
assert.equal(films.length, 1, "Now Playing without a clock is skipped");
assert.equal(films[0].title, "The Piano");
assert.ok(films[0].times.some((t) => /7:00 PM/.test(t)));
assert.equal(films[0].venue, "Michigan Theater");

const icsSrc: Source = {
  id: "src_aaps_cal",
  name: "AAPS",
  homepage: "https://www.a2schools.org/",
  feed_url: "https://example.com/cal.ics",
  pull_method: "ics",
  beat_id: "beat_schools",
  enabled: true,
  notes: "",
  lane: "school_cal",
};
const ics = eventsFromIcsText(
  [
    "BEGIN:VCALENDAR",
    "BEGIN:VEVENT",
    "DTSTART;VALUE=DATE:20260907",
    "SUMMARY:Labor Day — No School",
    "UID:labor-2026",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n"),
  icsSrc,
  now,
);
assert.equal(ics.length, 1);
assert.equal(ics[0].time_unknown, true, "all-day ICS is not 8:00 PM");
assert.equal(ics[0].starts_at, "2026-09-07T04:00:00.000Z");

const newsSrc: Source = {
  id: "src_a2_news",
  name: "City of Ann Arbor — News",
  homepage: "https://www.a2gov.org/",
  feed_url: "https://www.a2gov.org/news/",
  pull_method: "html",
  beat_id: "beat_government",
  enabled: true,
  notes: "",
  lane: "wire",
  family: "official",
};
const news = extractA2GovNews(
  `<ul>
  <li class="gs-feed-list-item items-1">
    <a href="/news/posts/carbon-offsets/" class="gs-feed-list-title">Carbon offsets survey</a>
    <span class="gs-feed-list-date">Aug 14, 2026</span>
  </li>
  </ul>`,
  newsSrc,
);
assert.equal(news.length, 1);
assert.equal(news[0].title, "Carbon offsets survey");
assert.equal(news[0].dek, "", "headline and link only");
assert.equal(
  news[0].url,
  "https://www.a2gov.org/news/posts/carbon-offsets/",
);
assert.equal(news[0].published_at, "2026-08-14T04:00:00.000Z");

const rideSrc: Source = {
  id: "src_theride",
  name: "TheRide — News",
  homepage: "https://www.theride.org/",
  feed_url: "https://www.theride.org/about/news",
  pull_method: "html",
  beat_id: "beat_transit",
  enabled: true,
  notes: "",
  lane: "wire",
  family: "official",
};
const ride = extractTheRideNews(
  `<article class="content-article content-teaser">
    <h2><a href="/about/news/theride-announces-2026-labor-day-transit-schedule">TheRide Announces 2026 Labor Day Transit Schedule</a></h2>
    <p class="text-meta">AUGUST 17, 2026</p>
  </article>
  <article class="content-alert content-teaser">
    <h2><a href="/alerts/foo">System alert</a></h2>
    <p class="text-meta">Live</p>
  </article>`,
  rideSrc,
);
assert.equal(ride.length, 1, "TheRide skips undated alerts");
assert.equal(
  ride[0].title,
  "TheRide Announces 2026 Labor Day Transit Schedule",
);
assert.equal(
  ride[0].url,
  "https://www.theride.org/about/news/theride-announces-2026-labor-day-transit-schedule",
);
assert.equal(ride[0].dek, "", "headline and link only");
assert.equal(ride[0].published_at, "2026-08-17T04:00:00.000Z");

const aadlSrc: Source = {
  id: "src_aadl_events",
  name: "AADL",
  homepage: "https://aadl.org/",
  feed_url: "https://aadl.org/events-feed/upcoming",
  pull_method: "html",
  beat_id: "beat_events",
  enabled: true,
  notes: "",
  lane: "events",
};
const aadl = extractAadlEvents(
  `<div class="views-row search-result">
    <h2 class="no-margin"><a href="/node/668597">Joyful Movement: Zumba Party</a></h2>
    <p>Monday August 31, 2026: 6:00pm to
              7:00pm
            <br>
                      Pittsfield Branch: Program Room                </div>
    <h2 class="no-margin"><a href="/node/644686">Preschool Storytimes</a></h2>
    <p>Tuesday September 1, 2026: 11:00am to
              11:30am
            <br>
                      Malletts Creek Branch: Program Room                    <br>
      Age 2–5 Years</p>`,
  aadlSrc,
  now,
);
assert.equal(aadl.length, 2);
assert.equal(aadl[0].title, "Joyful Movement: Zumba Party");
assert.equal(aadl[0].url, "https://aadl.org/node/668597");
assert.equal(aadl[0].place, "Pittsfield Branch: Program Room");
assert.equal(aadl[0].starts_at, "2026-08-31T22:00:00.000Z");
assert.equal(aadl[1].starts_at, "2026-09-01T15:00:00.000Z");

const civicClerkSrc: Source = {
  id: "src_washtenaw_calendar",
  name: "Washtenaw County — Calendar",
  homepage: "https://www.washtenaw.org/",
  feed_url: "https://washtenawcomi.api.civicclerk.com/v1/Events",
  pull_method: "html",
  beat_id: "beat_government",
  enabled: true,
  notes: "",
  lane: "civic",
};
const washtenaw = extractCivicClerkMeetings(
  {
    value: [
      {
        id: 4079,
        eventName: "Board of Commissioners Meeting",
        startDateTime: "2026-09-02T19:00:00Z",
        eventLocation: { address1: "220 N. Main", city: "Ann Arbor" },
      },
      {
        id: 1,
        eventName: "CANCELLED - Historic District Commission",
        startDateTime: "2026-09-03T17:30:00Z",
        eventLocation: { address1: "415 W Michigan Ave" },
      },
    ],
  },
  civicClerkSrc,
  now,
);
assert.equal(washtenaw.length, 1, "cancelled CivicClerk rows are skipped");
assert.equal(washtenaw[0].title, "Board of Commissioners Meeting");
assert.equal(washtenaw[0].place, "220 N. Main, Ann Arbor");
assert.equal(
  washtenaw[0].starts_at,
  "2026-09-02T23:00:00.000Z",
  "CivicClerk 19:00Z is 7:00 PM Detroit, not 3:00 PM",
);
assert.equal(
  washtenaw[0].url,
  "https://washtenawcomi.portal.civicclerk.com/event/4079",
);

process.env.SITE_ID = "ann-arbor";
process.env.NEXT_PUBLIC_SITE_ID = "ann-arbor";
resetSiteCache();

assert.equal(
  reservedPlaceForCluster({
    title: "City Council sets hearing",
    dek: "",
    url: "https://cityofypsilanti.com/CivicAlerts.aspx?aid=2749",
    sources: [{ id: "src_ypsi_news", name: "City of Ypsilanti — News" }],
  }),
  "Ypsilanti",
);
assert.equal(
  reservedPlaceForCluster({
    title: "DTE gas main work downtown",
    dek: "",
    url: "https://www.city-chelsea.org/news_detail_T2_R191.php",
    sources: [{ id: "src_chelsea_news", name: "City of Chelsea — News" }],
  }),
  "Chelsea",
);
assert.equal(
  reservedPlaceForCluster({
    title: "Chelsea millage vote set for November",
    dek: "",
    url: "https://thesuntimesnews.com/chelsea-millage/",
    sources: [{ id: "src_suntimes", name: "The Sun Times News" }],
  }),
  "Chelsea",
);

function aroundStory(
  partial: Pick<ClusteredStory, "id" | "title" | "url" | "sources"> & {
    published_at?: string;
  },
): ClusteredStory {
  return {
    dek: "",
    published_at: partial.published_at ?? "2026-09-01T15:00:00.000Z",
    is_original: false,
    byline: null,
    slug: null,
    image_url: null,
    body: null,
    ...partial,
  };
}

const aroundNow = new Date("2026-09-02T16:00:00.000Z");
const aroundMix = selectAroundTheBay(
  [
    aroundStory({
      id: "c_daily_1",
      title: "Ann Arbor housing survey results",
      url: "https://www.michigandaily.com/news/housing-survey/",
      sources: [{ id: "src_michigandaily", name: "The Michigan Daily" }],
      published_at: "2026-09-02T14:00:00.000Z",
    }),
    aroundStory({
      id: "c_daily_2",
      title: "Ann Arbor zoning rewrite heads to council",
      url: "https://www.michigandaily.com/news/zoning-rewrite/",
      sources: [{ id: "src_michigandaily", name: "The Michigan Daily" }],
      published_at: "2026-09-02T13:30:00.000Z",
    }),
    aroundStory({
      id: "c_daily_3",
      title: "Campus budget hearing set",
      url: "https://www.michigandaily.com/news/budget-hearing/",
      sources: [{ id: "src_michigandaily", name: "The Michigan Daily" }],
      published_at: "2026-09-02T13:00:00.000Z",
    }),
    aroundStory({
      id: "c_saline_1",
      title: "Saline River Dam update",
      url: "https://www.salinemi.gov/news_detail_T2_R1.php",
      sources: [{ id: "src_saline_news", name: "City of Saline — News" }],
      published_at: "2026-09-02T12:00:00.000Z",
    }),
    aroundStory({
      id: "c_saline_2",
      title: "Saline ROMP festival parking",
      url: "https://www.salinemi.gov/news_detail_T2_R2.php",
      sources: [{ id: "src_saline_news", name: "City of Saline — News" }],
      published_at: "2026-09-02T11:30:00.000Z",
    }),
    aroundStory({
      id: "c_saline_3",
      title: "Saline council packets posted",
      url: "https://www.salinemi.gov/news_detail_T2_R3.php",
      sources: [{ id: "src_saline_news", name: "City of Saline — News" }],
      published_at: "2026-09-02T11:00:00.000Z",
    }),
    aroundStory({
      id: "c_ypsi",
      title: "Ypsilanti data-center moratorium",
      url: "https://www.cityofypsilanti.com/CivicAlerts.aspx?aid=1",
      sources: [{ id: "src_ypsi_news", name: "City of Ypsilanti — News" }],
      published_at: "2026-09-01T18:00:00.000Z",
    }),
    aroundStory({
      id: "c_chelsea",
      title: "Chelsea DTE gas main work",
      url: "https://www.city-chelsea.org/news_detail_T2_R191.php",
      sources: [{ id: "src_chelsea_news", name: "City of Chelsea — News" }],
      published_at: "2026-09-01T17:00:00.000Z",
    }),
    aroundStory({
      id: "c_dexter",
      title: "Dexter July police report",
      url: "https://thesuntimesnews.com/dexter-july-police-report/",
      sources: [{ id: "src_suntimes", name: "The Sun Times News" }],
      published_at: "2026-08-20T12:00:00.000Z",
    }),
  ],
  { limit: 6, maxOfficial: 2, now: aroundNow },
);
const aroundPlaces = aroundMix.map((c) => reservedPlaceForCluster(c));
assert.ok(aroundPlaces.includes("Ypsilanti"), "Around reserves Ypsilanti");
assert.ok(aroundPlaces.includes("Saline"), "Around reserves Saline");
assert.ok(aroundPlaces.includes("Chelsea"), "Around reserves Chelsea");
assert.ok(aroundPlaces.includes("Dexter"), "Around reserves Dexter");
assert.equal(
  aroundMix.slice(0, 4).map((c) => reservedPlaceForCluster(c)).join(","),
  "Ypsilanti,Saline,Chelsea,Dexter",
  "Suburb slots come before extra city-hall RSS",
);
assert.equal(
  aroundMix.filter((c) => c.sources[0]?.id === "src_saline_news").length,
  1,
  "Saline city RSS does not take three of the first six slots",
);

assert.equal(
  looksLikeWashtenawPrep({
    title: "Big Reds Tennis Takes On Dexter and Tecumseh",
    url: "https://thesuntimesnews.com/big-reds-tennis/",
  }),
  true,
);
assert.equal(
  looksLikeWashtenawPrep({
    title: "City of Ann Arbor tackles uptick of littering in the Huron River",
    url: "https://www.wemu.org/wemu-news/huron-river",
  }),
  false,
);
assert.equal(
  looksLikeWashtenawPrep({
    title: "Wolverines football opens Big Ten play",
    url: "https://www.michigandaily.com/sports/football/",
  }),
  false,
);
assert.equal(
  looksLikeWashtenawPrep({
    title: "Ypsi resident develops app to help delivery drivers share info",
    url: "https://concentratemedia.com/ypsi-app/",
  }),
  false,
);
assert.equal(
  looksLikeWashtenawPrep({
    title: "Milan football opens at Riverview",
    url: "https://milanbigreds.org/Event/x",
  }),
  true,
);

const arkShow = showListingFromEvent(
  {
    id: "evt_ark",
    title: "The Brudi Brothers",
    starts_at: "2026-09-03T00:00:00.000Z",
    place: "The Ark",
    url: "https://theark.org/event/the-brudi-brothers/",
    source_id: "src_ark_events",
  },
  "src_theark",
  "The Ark",
);
assert.equal(arkShow.source_id, "src_theark");
assert.equal(arkShow.venue, "The Ark");
assert.equal(arkShow.time_unknown, undefined);
assert.ok(arkShow.times.length === 1, "Ark show keeps the printed clock");

const encore = extractEncoreShowsFromTribe(
  JSON.stringify({
    events: [
      {
        title: "Sister Act",
        url: "https://theencoretheatre.org/event/sister-act/",
        start_date: "2026-10-08 00:01:00",
        end_date: "2026-10-17 23:30:00",
        venue: { venue: "The Encore Musical Theatre" },
      },
    ],
  }),
  {
    id: "src_encore_shows",
    name: "The Encore Theatre — Shows",
    homepage: "https://theencoretheatre.org/",
    feed_url: "https://theencoretheatre.org/wp-json/tribe/events/v1/events",
    pull_method: "html",
    beat_id: "beat_shows",
    enabled: true,
    notes: "",
    lane: "shows",
  },
  new Date("2026-09-02T16:00:00.000Z"),
);
assert.equal(encore.length, 1, "Encore tribe run is one production");
assert.equal(encore[0].title, "Sister Act");
assert.equal(encore[0].time_unknown, true, "12:01 AM is not a curtain");
assert.equal(encore[0].times.length, 0);

const clock = parseEventLinkWhen("Thu, Sep. 3 2026 3:00 PM EDT");
assert.ok(clock && !clock.timeUnknown, "EventLink EDT clock");
assert.equal(clock!.starts.toISOString(), "2026-09-03T19:00:00.000Z");
const tbd = parseEventLinkWhen("Fri, Sep. 4 2026 TBD");
assert.ok(tbd?.timeUnknown, "EventLink TBD is time_unknown");
assert.equal(tbd!.starts.toISOString(), "2026-09-04T04:00:00.000Z");
assert.equal(
  parseEventLinkWhen("Thu, Sep. 3 2026 4:30 PM MDT"),
  null,
  "Idaho MDT is not Washtenaw",
);

const pioneerHtml = `
<table><tbody>
<tr><th>Calendar</th></tr>
<tr>
  <td><h4>Soccer (Boys V)</h4></td>
  <td><p>Skyline High School <span>(A)</span></p></td>
  <td><p>Thu, Sep. 3 2026</p><p>7:00 PM EDT</p></td>
  <td><p>Skyline High School</p></td>
  <td><a href="/Event/abc-1">DETAILS</a></td>
</tr>
<tr>
  <td><h4>Water Polo (Boys V)</h4></td>
  <td><p>Upper Arlington Tournament (A)</p></td>
  <td><p>Fri, Sep. 4 2026</p><p>TBD</p></td>
  <td><p>Upper Arlington High School</p></td>
  <td><a href="/Event/abc-2">DETAILS</a></td>
</tr>
</tbody></table>
`;
const pioneerGames = extractEventLinkGames(
  pioneerHtml,
  {
    id: "src_pioneer_ath",
    name: "Pioneer HS Athletics",
    homepage: "https://pioneerathletics.net/",
    feed_url: "https://pioneerathletics.net/Events",
    pull_method: "html",
    beat_id: "beat_hs_sports",
    enabled: true,
    notes: "",
    lane: "athletics",
  },
  new Date("2026-09-02T16:00:00.000Z"),
  "https://pioneerathletics.net/Events",
);
assert.equal(pioneerGames.length, 2, "EventLink rows become games");
assert.equal(pioneerGames[0].school, "Pioneer");
assert.equal(pioneerGames[0].title, "Soccer (Boys V) — Skyline High School (A)");
assert.equal(pioneerGames[0].time_unknown, undefined);
assert.equal(pioneerGames[1].time_unknown, true, "TBD row stays time_unknown");
assert.ok(
  pioneerGames[0].url?.includes("/Event/abc-1"),
  "DETAILS permalink kept",
);
assert.equal(
  extractEventLinkGames(
    `<table><tr>
      <td>Golf (Girls V)</td>
      <td>Canceled: Lincoln Senior High School (A)</td>
      <td>Thu, Sep. 3 2026 3:00 PM EDT</td>
      <td>Lincoln</td>
    </tr></table>`,
    {
      id: "src_saline_ath",
      name: "Saline HS Athletics",
      homepage: "https://salinehornets.com/",
      feed_url: "https://websites.eventlink.com/s/saline/Events",
      pull_method: "html",
      beat_id: "beat_hs_sports",
      enabled: true,
      notes: "",
      lane: "athletics",
    },
    new Date("2026-09-02T16:00:00.000Z"),
  ).length,
  0,
  "Canceled EventLink rows are dropped",
);

const milanGames = extractEventLinkGames(
  `<table><tbody>
<tr>
  <td><h4>Football (Boys V)</h4></td>
  <td><p>Riverview Community High School <span>(H)</span></p></td>
  <td><p>Thu, Sep. 3 2026</p><p>7:00 PM EDT</p></td>
  <td><p>Milan High School</p></td>
  <td><a href="/Event/milan-1">DETAILS</a></td>
</tr>
</tbody></table>`,
  {
    id: "src_milan_ath",
    name: "Milan HS Athletics",
    homepage: "https://milanbigreds.org/",
    feed_url: "https://milanbigreds.org/Events",
    pull_method: "html",
    beat_id: "beat_hs_sports",
    enabled: true,
    notes: "",
    lane: "athletics",
  },
  new Date("2026-09-02T16:00:00.000Z"),
  "https://milanbigreds.org/Events",
);
assert.equal(milanGames.length, 1);
assert.equal(milanGames[0].school, "Milan");
assert.ok(
  milanGames[0].url?.includes("/Event/milan-1"),
  "Milan DETAILS permalink kept",
);
assert.equal(
  extractEventLinkGames(
    `<table><tr>
      <td>Golf (Girls V)</td>
      <td>Canceled: E.C./Lawrenceburg/Milan (A)</td>
      <td>Thu, Sep. 3 2026 5:00 PM EDT</td>
      <td>Lawrenceburg</td>
    </tr></table>`,
    {
      id: "src_milan_ath",
      name: "Milan HS Athletics",
      homepage: "https://milanbigreds.org/",
      feed_url: "https://milanbigreds.org/Events",
      pull_method: "html",
      beat_id: "beat_hs_sports",
      enabled: true,
      notes: "",
      lane: "athletics",
    },
    new Date("2026-09-02T16:00:00.000Z"),
  ).length,
  0,
  "Indiana Milan EventLink lookalikes still drop Canceled rows",
);

console.log("test-aa-listings: ok");
console.log(
  `  civic ${civic.length}; ark ${ark!.title}; ums ${ums[0].title}`,
);
