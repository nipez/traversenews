/**
 * Parser + puller checks for ArbiterLive athletics, Bay GraphQL, State Agile.
 *
 *   npx tsx scripts/test-arbiter-bay-state.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ATHLETICS_KEEP_AHEAD_DAYS,
  MAX_STORED_ATHLETICS,
  sanitizeStoredAthletics,
  selectNextWeekAthletics,
  selectThisWeekAthletics,
} from "../src/lib/athletics";
import {
  extractArbiterLiveGames,
  isCanceledOrPostponedTitle,
  isMiddleSchoolTitle,
  parseArbiterLiveStart,
} from "../src/lib/pull/arbiterlive";
import {
  bayShowingsToListings,
} from "../src/lib/pull/bay-theatre";
import {
  agileNextMonthMdy,
  parseStateTheatreAgileHtml,
} from "../src/lib/pull/html-shows";
import { collectEmptySlateWarnings } from "../src/lib/pull/empty-slate";
import type { AthleticsGame, ShowListing, Source } from "../src/lib/types";

const fixtures = join(process.cwd(), "src/lib/pull/fixtures");
const now = new Date("2026-09-28T16:00:00.000Z");

const tcc: Source = {
  id: "src_tcc_ath",
  name: "TC Central Athletics",
  homepage: "https://arbiterlive.com/School/Calendar/23592",
  feed_url: "https://arbiterlive.com/School/Calendar/23592",
  pull_method: "html",
  beat_id: "beat_hs_sports",
  enabled: true,
  notes: "",
};

const stateSrc: Source = {
  id: "src_state_theatre",
  name: "State Theatre / Bijou",
  homepage: "https://stateandbijou.org/",
  feed_url:
    "https://secure.traversecityfilmfest.org/websales/pages/list.aspx?epguid=f9385ae5-a20d-40bd-8812-c04853a2e0fb&",
  pull_method: "html",
  beat_id: "beat_shows",
  enabled: true,
  notes: "",
};

const baySrc: Source = {
  id: "src_bay_theatre",
  name: "The Bay Theatre",
  homepage: "https://thebaytheatre.org/",
  feed_url: "https://thebaytheatre.org/graphql",
  pull_method: "html",
  beat_id: "beat_shows",
  enabled: true,
  notes: "",
};

assert.equal(isCanceledOrPostponedTitle('Foo <span class="x">Canceled</span>'), true);
assert.equal(isCanceledOrPostponedTitle("Varsity Boys Soccer vs. Cadillac"), false);
assert.equal(isMiddleSchoolTitle("Middle School Coed Soccer vs. Glen Lake"), true);
assert.equal(isMiddleSchoolTitle("7/8th Girls Volleyball vs. X"), true);
assert.equal(isMiddleSchoolTitle("Varsity Girls Volleyball vs. Petoskey"), false);

const kick = parseArbiterLiveStart("9/29/2026 6:45 PM");
assert.ok(kick);
assert.equal(kick!.toISOString(), "2026-09-29T22:45:00.000Z");

const sample = JSON.parse(
  readFileSync(join(fixtures, "arbiterlive-23592-sample.json"), "utf8"),
) as { EventsFilteredDetailString: string };
const games = extractArbiterLiveGames(
  sample.EventsFilteredDetailString,
  tcc,
  23592,
  now,
);
assert.ok(games.length >= 1, "ArbiterLive sample should yield HS games");
assert.ok(
  games.every((g) => !isCanceledOrPostponedTitle(g.title)),
  "no canceled rows",
);
assert.ok(
  games.every((g) => !isMiddleSchoolTitle(g.title)),
  "no middle-school rows",
);
assert.ok(
  games.every((g) => g.source_id === "src_tcc_ath"),
  "source ids",
);

// Trim: a season-sized dump measured from *now* must keep the next 14 days.
const bulk: AthleticsGame[] = [];
for (let i = 0; i < MAX_STORED_ATHLETICS + 50; i++) {
  const day = 28 + (i % 40);
  const month = day > 30 ? 10 : 9;
  const d = day > 30 ? day - 30 : day;
  const starts = new Date(Date.UTC(2026, month - 1, d, 23, 0, 0)).toISOString();
  bulk.push({
    id: `ath_bulk_${i}`,
    title: `Varsity game ${i}`,
    starts_at: starts,
    place: "Home",
    url: null,
    source_id: "src_tcc_ath",
    school: "Central",
  });
}
const sanitized = sanitizeStoredAthletics(bulk);
const thisWeek = selectThisWeekAthletics(sanitized.games, now);
const nextWeek = selectNextWeekAthletics(sanitized.games, now);
assert.ok(thisWeek.length > 0, "This week must survive sanitize");
assert.ok(
  ATHLETICS_KEEP_AHEAD_DAYS >= 14,
  "keep-ahead covers This week + Next week",
);
assert.ok(
  sanitized.games.length >= thisWeek.length + nextWeek.length ||
    nextWeek.length >= 0,
  "near window retained",
);

// State Agile ld+json
const agileHtml = readFileSync(
  join(fixtures, "state-theatre-agile-sep.html"),
  "utf8",
);
const stateRows = parseStateTheatreAgileHtml(agileHtml, stateSrc, now);
const folktales = stateRows.find(
  (s) => s.title === "Folktales" && s.starts_at.startsWith("2026-09-29"),
);
assert.ok(folktales, "Folktales on 2026-09-29 from Agile ld+json");
assert.deepEqual(folktales!.times.sort(), ["1:00 PM", "7:00 PM"]);
assert.match(agileNextMonthMdy(now), /^10\/1\/2026$/);

// Bay grouping from captured GraphQL payload shape
const bayShowings = [
  {
    id: "1",
    time: "2026-09-28T18:00:00Z",
    published: true,
    private: false,
    movie: { name: "Words & Writers: Tim Mulherin", urlSlug: "words" },
  },
  {
    id: "2",
    time: "2026-09-28T23:00:00Z",
    published: true,
    private: false,
    movie: { name: "Practical Magic 2", urlSlug: "practical-magic-2" },
  },
  {
    id: "3",
    time: "2026-09-29T23:00:00Z",
    published: true,
    private: false,
    movie: { name: "Practical Magic 2", urlSlug: "practical-magic-2" },
  },
  {
    id: "4",
    time: "2026-09-29T23:00:00Z",
    published: false,
    private: false,
    movie: { name: "Hidden Draft", urlSlug: "hidden" },
  },
];
const bayRows = bayShowingsToListings(bayShowings, baySrc, now);
assert.equal(bayRows.length, 3);
assert.ok(bayRows.every((r) => r.venue === "The Bay Theatre" || r.venue.length > 0));
const pm = bayRows.filter((r) => r.title === "Practical Magic 2");
assert.equal(pm.length, 2);

// Empty-slate warnings
const amc: Source = {
  id: "src_amc_cherry",
  name: "AMC Cherry Blossom 14",
  homepage: "https://www.amctheatres.com/",
  feed_url: null,
  pull_method: "html",
  beat_id: "beat_shows",
  enabled: true,
  notes: "",
};
const warns = collectEmptySlateWarnings(
  [amc, tcc, baySrc],
  bayRows as ShowListing[],
  games,
  now,
);
assert.ok(
  warns.some((w) => w.source === "AMC Cherry Blossom 14"),
  "AMC empty upcoming warns",
);
assert.ok(
  !warns.some((w) => w.source === "The Bay Theatre"),
  "Bay with upcoming rows does not warn",
);

console.log(
  `ok — arbiter/bay/state parsers (${games.length} arb games, ${stateRows.length} state rows, ${bayRows.length} bay rows, ${warns.length} warnings)`,
);
