/**
 * Desk speed regressions:
 * - sanitizer `changed` stays false when overflow cannot drop upcoming rows
 * - loadStore does not saveStore when scrub finds nothing to change
 *
 * Run: npx tsx scripts/test-desk-store-speed.ts
 */
import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  MAX_STORED_ATHLETICS,
  sanitizeStoredAthletics,
} from "../src/lib/athletics";
import { createSeedData } from "../src/lib/data/seed";
import {
  loadStore,
  resetMemoryStore,
  withSkippedPublicSnapshots,
} from "../src/lib/data/store";
import {
  MAX_STORED_EVENTS,
  sanitizeStoredEvents,
} from "../src/lib/events";
import {
  MAX_STORED_SCHOOLS,
  sanitizeStoredSchools,
} from "../src/lib/schools";
import {
  MAX_STORED_SHOWS,
  sanitizeStoredShows,
} from "../src/lib/shows";
import type {
  AthleticsGame,
  EventItem,
  SchoolCalendarItem,
  ShowListing,
} from "../src/lib/types";

const STORE_FILE = join(process.cwd(), ".data", "store.json");

function futureIso(daysFromNow: number): string {
  return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString();
}

function pastIso(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
}

function schoolRow(i: number, starts_at: string): SchoolCalendarItem {
  return {
    id: `sch_overflow_${i}`,
    title: "No school — district break",
    starts_at,
    place: "TCAPS",
    url: null,
    source_id: "src_tcaps_cal",
    district: "TCAPS",
    time_unknown: true,
  };
}

function showRow(i: number, starts_at: string): ShowListing {
  return {
    id: `show_overflow_${i}`,
    title: `Film ${i}`,
    venue: "State Theatre",
    starts_at,
    ends_at: null,
    times: ["7:00 PM"],
    url: null,
    source_id: "src_state_theatre",
  };
}

function eventRow(i: number, starts_at: string): EventItem {
  return {
    id: `evt_overflow_${i}`,
    title: `Community event ${i}`,
    starts_at,
    place: "Downtown",
    url: null,
    source_id: "src_visit_events",
  };
}

function athleticsRow(i: number, starts_at: string): AthleticsGame {
  return {
    id: `ath_overflow_${i}`,
    title: `Varsity football ${i}`,
    starts_at,
    place: "Home",
    url: null,
    source_id: "src_tcc_ath",
    school: "Central",
  };
}

function assertOverflowUnchanged() {
  const schoolCount = MAX_STORED_SCHOOLS + 40;
  const schools = Array.from({ length: schoolCount }, (_, i) =>
    schoolRow(i, futureIso(i + 1)),
  );
  const sch = sanitizeStoredSchools(schools);
  assert.equal(sch.changed, false, "schools: upcoming overflow must not be dirty");
  assert.equal(sch.items.length, schoolCount, "schools: keep all upcoming rows");

  const showCount = MAX_STORED_SHOWS + 40;
  const shows = Array.from({ length: showCount }, (_, i) =>
    showRow(i, futureIso(i + 1)),
  );
  const sh = sanitizeStoredShows(shows);
  assert.equal(sh.changed, false, "shows: upcoming overflow must not be dirty");
  assert.equal(sh.shows.length, showCount, "shows: keep all upcoming rows");

  const eventCount = MAX_STORED_EVENTS + 40;
  const events = Array.from({ length: eventCount }, (_, i) =>
    eventRow(i, futureIso(i + 1)),
  );
  const ev = sanitizeStoredEvents(events);
  assert.equal(ev.changed, false, "events: upcoming overflow must not be dirty");
  assert.equal(ev.events.length, eventCount, "events: keep all upcoming rows");

  // Athletics soft-cap prefers the near window (~2 weeks). Put every game in that
  // window so capping cannot drop rows — same overflow-without-drop case.
  const athCount = MAX_STORED_ATHLETICS + 40;
  const games = Array.from({ length: athCount }, (_, i) =>
    athleticsRow(i, futureIso((i % 10) + 1)),
  );
  const ath = sanitizeStoredAthletics(games);
  assert.equal(ath.changed, false, "athletics: near overflow must not be dirty");
  assert.equal(ath.games.length, athCount, "athletics: keep all near-window rows");
}

function assertOverflowDropsPast() {
  const upcoming = Array.from({ length: MAX_STORED_SCHOOLS + 10 }, (_, i) =>
    schoolRow(i, futureIso(i + 1)),
  );
  const past = Array.from({ length: 5 }, (_, i) =>
    schoolRow(10_000 + i, pastIso(i + 2)),
  );
  const sch = sanitizeStoredSchools([...upcoming, ...past]);
  assert.equal(sch.changed, true, "schools: dropping past rows is a real change");
  assert.equal(
    sch.items.length,
    upcoming.length,
    "schools: past dropped when upcoming already over soft-cap",
  );
  assert.ok(
    sch.items.every((g) => !past.some((p) => p.id === g.id)),
    "schools: no past ids retained when there is no room",
  );
}

async function assertLoadStoreNoSaveWhenClean() {
  await withSkippedPublicSnapshots(async () => {
    const seed = createSeedData();
    seed.schools = Array.from({ length: MAX_STORED_SCHOOLS + 20 }, (_, i) =>
      schoolRow(i, futureIso(i + 1)),
    );
    seed.shows = Array.from({ length: MAX_STORED_SHOWS + 20 }, (_, i) =>
      showRow(i, futureIso(i + 1)),
    );

    // Normalize once (same as a prior clean save), then land on disk.
    const clean = resetMemoryStore(seed);
    await mkdir(join(process.cwd(), ".data"), { recursive: true });
    // Compact JSON — saveStore pretty-prints; a rewrite would change bytes.
    await writeFile(STORE_FILE, JSON.stringify(clean), "utf8");
    const before = await readFile(STORE_FILE, "utf8");

    // New epoch so React.cache (if any) does not short-circuit; file path still wins.
    resetMemoryStore(createSeedData());
    const loaded = await loadStore();

    assert.equal(
      loaded.schools.length,
      MAX_STORED_SCHOOLS + 20,
      "file load keeps over-cap upcoming schools",
    );
    assert.equal(
      loaded.shows.length,
      MAX_STORED_SHOWS + 20,
      "file load keeps over-cap upcoming shows",
    );

    const after = await readFile(STORE_FILE, "utf8");
    assert.equal(
      after,
      before,
      "loadStore must not rewrite store.json when scrub is unchanged",
    );
  });
}

async function main() {
  assertOverflowUnchanged();
  assertOverflowDropsPast();
  await assertLoadStoreNoSaveWhenClean();

  await rm(STORE_FILE, { force: true }).catch(() => undefined);

  console.log(
    "ok — sanitizer overflow unchanged; loadStore skips save when clean",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
