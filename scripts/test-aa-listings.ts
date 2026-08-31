/**
 * AA listing parsers + Around-town U-M varsity filter.
 * Run: npm run test:aa-listings
 */
import assert from "node:assert/strict";
import { looksLikeUmVarsity } from "../src/lib/around";
import {
  collectArkEventLinks,
  extractArkEventFromPage,
  extractLegistarMeetings,
  extractMarqueeLiveEvents,
  extractMarqueeShows,
  extractUmsListingEvents,
} from "../src/lib/pull/html-ann-arbor";
import { eventsFromIcsText } from "../src/lib/pull/ics";
import { resetSiteCache } from "../src/lib/sites";
import type { Source } from "../src/lib/types";

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

process.env.SITE_ID = "ann-arbor";
process.env.NEXT_PUBLIC_SITE_ID = "ann-arbor";
resetSiteCache();

console.log("test-aa-listings: ok");
console.log(
  `  civic ${civic.length}; ark ${ark!.title}; ums ${ums[0].title}`,
);
