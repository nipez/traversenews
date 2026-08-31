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
  extractUmsListingEvents,
} from "../src/lib/pull/html-ann-arbor";
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

process.env.SITE_ID = "ann-arbor";
process.env.NEXT_PUBLIC_SITE_ID = "ann-arbor";
resetSiteCache();

console.log("test-aa-listings: ok");
console.log(
  `  civic ${civic.length}; ark ${ark!.title}; ums ${ums[0].title}`,
);
