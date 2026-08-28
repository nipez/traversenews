/**
 * Parser checks for Shows HTML pull (State Theatre + Elk Rapids).
 * Run: npx tsx scripts/test-shows-parsers.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
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

console.log("ok — shows parsers");
console.log(
  `  state: ${state.length} listing(s); elk: ${elk.length} listing(s)`,
);
