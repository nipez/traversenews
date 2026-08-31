/**
 * Parser checks for Shows HTML pull (State Theatre + Elk Rapids + Alluvion).
 * Run: npx tsx scripts/test-shows-parsers.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseAlluvionHtml,
  parseElkRapidsCinemaHtml,
  parseStateTheatreHtml,
  parseStatedClocks,
} from "../src/lib/pull/html-shows";
import type { Source } from "../src/lib/types";

const fixtures = join(process.cwd(), "src/lib/pull/fixtures");
const now = new Date("2026-08-28T16:00:00.000Z");

const stateSrc: Source = {
  id: "src_state_theatre",
  name: "State Theatre / Bijou",
  homepage: "https://stateandbijou.org/",
  feed_url: "https://stateandbijou.org/",
  pull_method: "html",
  beat_id: "beat_shows",
  enabled: true,
  notes: "",
};

const elkSrc: Source = {
  id: "src_elk_cinema",
  name: "Elk Rapids Cinema",
  homepage: "https://www.elkrapidscinema.com/",
  feed_url: "https://www.elkrapidscinema.com/",
  pull_method: "html",
  beat_id: "beat_shows",
  enabled: true,
  notes: "",
};

const alluvionSrc: Source = {
  id: "src_alluvion",
  name: "The Alluvion",
  homepage: "https://www.thealluvion.org/",
  feed_url: "https://www.thealluvion.org/tickets",
  pull_method: "html",
  beat_id: "beat_shows",
  enabled: true,
  notes: "",
};

assert.deepEqual(parseStatedClocks("1pm, 4pm, and 7pm"), [
  "1:00 PM",
  "4:00 PM",
  "7:00 PM",
]);
assert.deepEqual(parseStatedClocks("no clocks here"), []);

const stateHtml = readFileSync(
  join(fixtures, "state-theatre.html"),
  "utf8",
);
const state = parseStateTheatreHtml(stateHtml, stateSrc, now);
assert.ok(state.length >= 1, "State Theatre should find Now Playing");
const tony = state.find((s) => s.title === "TONY");
assert.ok(tony, "TONY from Now Playing");
assert.ok(tony!.times.includes("Fri 7:00 PM"));
assert.ok(tony!.times.includes("Sat 1:00 PM"));
assert.equal(tony!.times.includes("12:00 PM"), false, "never invent noon");

const broadway = state.find((s) => /BROADWAY/i.test(s.title));
assert.ok(broadway, "Broadway coming soon title");
assert.ok(!/Thursday, September/i.test(broadway!.title));

const elkHtml = readFileSync(
  join(fixtures, "elk-rapids-cinema.html"),
  "utf8",
);
const elk = parseElkRapidsCinemaHtml(elkHtml, elkSrc, now);
assert.ok(elk.length >= 3, "Elk Rapids should find several films");
const coyote = elk.find((s) => /Coyote vs\. Acme/i.test(s.title));
assert.ok(coyote);
assert.deepEqual(coyote!.times, ["1:00 PM", "4:00 PM", "7:00 PM"]);
// One row per title — not one row per screen/day.
const coyoteCount = elk.filter((s) => /Coyote vs\. Acme/i.test(s.title)).length;
assert.equal(coyoteCount, 1);

const alluvionHtml = readFileSync(
  join(fixtures, "alluvion-tickets.html"),
  "utf8",
);
const alluvion = parseAlluvionHtml(alluvionHtml, alluvionSrc, now);
assert.ok(alluvion.length >= 5, "Alluvion should find upcoming dated shows");
const funky = alluvion.find(
  (s) =>
    /Funky Uncle/i.test(s.title) && s.starts_at.startsWith("2026-08-31"),
);
assert.ok(funky, "Funky Fun Mondays on 2026-08-31 from live fixture");
assert.deepEqual(funky!.times, ["7:00 PM"]);
assert.equal(funky!.venue, "The Alluvion");
assert.ok(
  funky!.url?.includes("/tickets/funky-fun-mondays/8-31-26"),
  "prefer event permalink",
);

const ravi7 = alluvion.find(
  (s) => /Ravi Coltrane/i.test(s.title) && /7PM/i.test(s.title),
);
const ravi9 = alluvion.find(
  (s) => /Ravi Coltrane/i.test(s.title) && /9PM/i.test(s.title),
);
assert.ok(ravi7 && ravi9, "separate 7PM / 9PM dated rows");
assert.deepEqual(ravi7!.times, ["7:00 PM"]);
assert.deepEqual(ravi9!.times, ["9:00 PM"]);

const pastJune = alluvion.filter((s) => s.starts_at.startsWith("2026-06-"));
assert.equal(pastJune.length, 0, "skip past dates from fixture");

console.log("ok — shows parsers");
console.log(
  `  state: ${state.length} listing(s); elk: ${elk.length} listing(s); alluvion: ${alluvion.length} listing(s)`,
);
