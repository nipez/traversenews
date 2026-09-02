import { detroitDayKey } from "@/lib/dates";
import type { EventItem } from "@/lib/types";

const DETROIT = "America/Detroit";

/**
 * Upcoming window for listings. Date-only (time_unknown) uses Detroit calendar
 * day so midnight sort anchors stay visible all day — without inventing a clock.
 */
export function eventInUpcomingWindow(
  event: EventItem,
  now: Date,
  options: { pastGraceMs?: number; horizonMs?: number } = {},
): boolean {
  const pastGraceMs = options.pastGraceMs ?? 60 * 60 * 1000;
  const horizonMs = options.horizonMs;

  if (event.time_unknown) {
    const day = detroitDayKey(event.starts_at);
    const today = detroitDayKey(now);
    if (day < today) return false;
    if (horizonMs != null) {
      const endDay = detroitDayKey(new Date(now.getTime() + horizonMs));
      if (day > endDay) return false;
    }
    return true;
  }

  const t = new Date(event.starts_at).getTime();
  if (Number.isNaN(t) || t < now.getTime() - pastGraceMs) return false;
  if (horizonMs != null && t > now.getTime() + horizonMs) return false;
  return true;
}
/** Normalize place to the venue name (drop street noise for cross-feed matches). */
export function normalizePlace(place: string): string {
  return place
    .split(",")[0]
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Detroit calendar day + hour for grouping the same meeting. */
export function detroitDayHour(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 13);
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: DETROIT,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: DETROIT,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(d);
  return `${day}T${hour}`;
}

/** Stable fingerprint for the same meeting across pulls / feeds. */
export function eventDedupeKey(event: {
  title: string;
  starts_at: string;
  place: string;
  source_id?: string;
}): string {
  return [
    event.title.trim().toLowerCase().replace(/\s+/g, " "),
    detroitDayHour(event.starts_at),
    normalizePlace(event.place),
  ].join("|");
}

/** FNV-1a hex for stable event ids in Workers (no Node crypto). */
export function shortHash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function stableEventId(sourceId: string, uid: string): string {
  return `evt_${shortHash(`${sourceId}:${uid}`)}`;
}

/**
 * Keep one row per title+local day/hour+venue.
 * Prefer the longer place string when merging near-duplicates.
 */
export function dedupeEvents(events: EventItem[]): EventItem[] {
  const byKey = new Map<string, EventItem>();
  for (const event of events) {
    const key = eventDedupeKey(event);
    const existing = byKey.get(key);
    if (!existing || event.place.length > existing.place.length) {
      byKey.set(key, event);
    }
  }
  return Array.from(byKey.values()).sort(
    (a, b) =>
      new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
}

const CIVIC_BEATS = new Set(["beat_government", "beat_schools"]);

/** Explicit civic desks (even if beat was mis-tagged historically). */
const CIVIC_SOURCE_IDS = new Set(["src_gt_cal", "src_civicweb", "src_leelanau_co"]);

/** True when this source belongs on /civic, not /whats-on. */
export function isCivicSource(
  source: { id: string; beat_id: string } | undefined,
): boolean {
  if (!source) return false;
  return CIVIC_BEATS.has(source.beat_id) || CIVIC_SOURCE_IDS.has(source.id);
}

/**
 * HS athletics calendars belong on Sports This week, never /whats-on.
 * Importing them as EventItem rows can balloon KV and 503 the Worker.
 */
export const HS_ATHLETICS_EVENT_SOURCE_IDS = new Set([
  "src_tcc_ath",
  "src_tcw_ath",
  "src_tcsf_ath",
  "src_tcch_ath",
  "src_elk_ath",
  "src_suttons_ath",
  "src_leland_ath",
  "src_glenlake_ath",
  "src_kingsley_ath",
  "src_benzie_ath",
  "src_frankfort_ath",
  "src_kalkaska_ath",
  "src_forest_ath",
  "src_mancelona_ath",
  "src_buckley_ath",
  "src_northport_ath",
  "src_centrallake_ath",
]);

/**
 * District academic calendars belong on /schools, never Events or Civic.
 */
export const SCHOOL_CALENDAR_SOURCE_IDS = new Set([
  "src_tcaps_cal",
  "src_gtacs_cal",
  "src_gta_cal",
  "src_elk_cal",
  "src_suttons_cal",
  "src_leland_cal",
  "src_glenlake_cal",
  "src_kingsley_cal",
  "src_tcch_cal",
]);

export function isHsAthleticsEventSource(sourceId: string): boolean {
  return HS_ATHLETICS_EVENT_SOURCE_IDS.has(sourceId);
}

export function isSchoolCalendarSource(sourceId: string): boolean {
  return SCHOOL_CALENDAR_SOURCE_IDS.has(sourceId);
}

/** Movies + live theatre belong on /shows, never What's on / Tonight. */
export const SHOW_EVENT_SOURCE_IDS = new Set([
  "src_state_theatre",
  "src_bay_theatre",
  "src_elk_cinema",
  "src_amc_cherry",
  "src_oldtown",
  "src_city_opera",
  "src_alluvion",
]);

export function isShowEventSource(sourceId: string): boolean {
  return SHOW_EVENT_SOURCE_IDS.has(sourceId);
}

/** Soft ceiling so a fat import cannot take down public pages. */
export const MAX_STORED_EVENTS = 250;

/**
 * Drop athletics + school calendars and trim oldest past rows when over the soft ceiling.
 * Never invents listings — only removes.
 */
export function sanitizeStoredEvents(events: EventItem[]): {
  events: EventItem[];
  changed: boolean;
} {
  const without = events.filter(
    (e) =>
      !isHsAthleticsEventSource(e.source_id) &&
      !isSchoolCalendarSource(e.source_id) &&
      !isShowEventSource(e.source_id),
  );
  let next = dedupeEvents(without);
  let changed =
    next.length !== events.length ||
    next.map((e) => e.id).join(",") !== events.map((e) => e.id).join(",");

  if (next.length > MAX_STORED_EVENTS) {
    const now = Date.now();
    // Prefer keeping upcoming; drop oldest past first.
    const upcoming = next.filter(
      (e) => new Date(e.starts_at).getTime() >= now - 6 * 60 * 60 * 1000,
    );
    const past = next
      .filter((e) => new Date(e.starts_at).getTime() < now - 6 * 60 * 60 * 1000)
      .sort(
        (a, b) =>
          new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime(),
      );
    const room = Math.max(0, MAX_STORED_EVENTS - upcoming.length);
    const capped = dedupeEvents([...upcoming, ...past.slice(0, room)]);
    // Overflow of upcoming-only rows must not flag dirty — nothing was dropped.
    if (
      capped.length !== next.length ||
      capped.map((e) => e.id).join(",") !== next.map((e) => e.id).join(",")
    ) {
      next = capped;
      changed = true;
    }
  }

  return { events: next, changed };
}

/** Prefer these desks for Tonight / What's on. */
const NIGHT_OUT_SOURCES = new Set([
  "src_visit_events",
  "src_interlochen",
  "src_tadl",
  "src_downtown",
  "src_tart",
  "src_opera",
  "src_tcphil",
  "src_dennos",
  "src_pride",
  "src_cherry",
  "src_ticker_cal",
]);

export function looksLikeMeeting(title: string): boolean {
  const t = title.toLowerCase();
  return (
    t.includes("board study") ||
    t.includes("committee meeting") ||
    t.includes("board of education") ||
    t.includes("study session") ||
    t.includes("regular meeting") ||
    t.includes("commission") ||
    t.includes("city council") ||
    t.includes("planning commission") ||
    t.includes("tcaps") ||
    /\bagenda\b/.test(t)
  );
}

export function looksLikeLowValueListing(title: string): boolean {
  const t = title.toLowerCase();
  return (
    t.includes("closed for renovation") ||
    t.includes("closed for hvac") ||
    t.includes("library - closed") ||
    /\bclosed\b/.test(t) && /\blibrary\b/.test(t) ||
    t.includes("submission window") ||
    t.includes("all day exhibit") ||
    t.includes("(submission window")
  );
}

/** Government + school board meetings — Civic rail only. */
export function isCivicEvent(
  event: EventItem,
  sources: Array<{ id: string; beat_id: string }>,
): boolean {
  const source = sources.find((s) => s.id === event.source_id);
  if (isCivicSource(source)) return true;
  return looksLikeMeeting(event.title);
}

/**
 * Tonight & What's on: concerts, community, markets, festivals, sports.
 * Never school-board / commission meetings (those stay on Civic).
 */
export function selectTonightEvents(
  events: EventItem[],
  sources: Array<{ id: string; beat_id: string }>,
  options: {
    now?: Date;
    limit?: number;
    horizonDays?: number;
    /** @deprecated Civic is always excluded from Tonight. */
    maxMeetings?: number;
    maxPerSource?: number;
    /** Exclude date-only rows (no invented featured clocks). */
    timedOnly?: boolean;
  } = {},
): EventItem[] {
  const now = options.now ?? new Date();
  const limit = options.limit ?? 6;
  const horizonDays = options.horizonDays ?? 5;
  const maxPerSource = options.maxPerSource ?? 3;
  const timedOnly = options.timedOnly === true;
  const beatBySource = new Map(sources.map((s) => [s.id, s.beat_id]));

  const windowed = dedupeEvents(events).filter((e) => {
    if (isHsAthleticsEventSource(e.source_id)) return false;
    if (isShowEventSource(e.source_id)) return false;
    if (timedOnly && e.time_unknown) return false;
    return (
      eventInUpcomingWindow(e, now, {
        horizonMs: horizonDays * 24 * 60 * 60 * 1000,
      }) &&
      !looksLikeLowValueListing(e.title) &&
      !isCivicEvent(e, sources)
    );
  });

  function score(e: EventItem): number {
    const beat = beatBySource.get(e.source_id) ?? "";
    let s = 0;
    if (NIGHT_OUT_SOURCES.has(e.source_id)) s += 800;
    if (beat === "beat_arts" || beat === "beat_events" || beat === "beat_sports") {
      s += 400;
    }
    // Prefer named concerts/markets for the peach featured band.
    const t = e.title.toLowerCase();
    if (t.includes("thorogood")) s += 5000;
    if (t.includes("brothers osborne")) s += 4900;
    if (t.includes("sara hardy")) s += 4800;
    if (e.source_id === "src_interlochen") s += 200;
    if (e.source_id === "src_visit_events") s += 150;
    // sooner first within tier
    s -= new Date(e.starts_at).getTime() / 1e12;
    return s;
  }

  const ranked = [...windowed].sort((a, b) => score(b) - score(a));
  const picked: EventItem[] = [];
  const perSource = new Map<string, number>();

  for (const event of ranked) {
    if (picked.length >= limit) break;
    const srcCount = perSource.get(event.source_id) ?? 0;
    if (srcCount >= maxPerSource) continue;
    picked.push(event);
    perSource.set(event.source_id, srcCount + 1);
  }

  return picked.sort(
    (a, b) =>
      new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
}

/** Short venue label for Events meta (drop street / city noise). */
export function venueKicker(place: string): string {
  const first = place.split(",")[0]?.trim() || place.trim();
  return first || "Traverse City";
}
