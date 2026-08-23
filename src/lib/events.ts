import type { EventItem } from "@/lib/types";

const DETROIT = "America/Detroit";

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

/** Prefer these desks for Tonight / What's on. */
const NIGHT_OUT_SOURCES = new Set([
  "src_visit_events",
  "src_interlochen",
  "src_tadl",
  "src_downtown",
  "src_tart",
  "src_opera",
  "src_dennos",
  "src_oldtown",
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

function looksLikeLowValueListing(title: string): boolean {
  const t = title.toLowerCase();
  return (
    t.includes("closed for renovation") ||
    t.includes("library - closed") ||
    t.includes("submission window") ||
    t.includes("all day exhibit")
  );
}

/** Government + school board meetings — Civic rail only. */
export function isCivicEvent(
  event: EventItem,
  sources: Array<{ id: string; beat_id: string }>,
): boolean {
  const beat = sources.find((s) => s.id === event.source_id)?.beat_id ?? "";
  return CIVIC_BEATS.has(beat) || looksLikeMeeting(event.title);
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
  } = {},
): EventItem[] {
  const now = options.now ?? new Date();
  const limit = options.limit ?? 6;
  const horizonDays = options.horizonDays ?? 5;
  const maxPerSource = options.maxPerSource ?? 3;
  const beatBySource = new Map(sources.map((s) => [s.id, s.beat_id]));

  const windowed = dedupeEvents(events).filter((e) => {
    const t = new Date(e.starts_at).getTime();
    return (
      t >= now.getTime() - 60 * 60 * 1000 &&
      t <= now.getTime() + horizonDays * 24 * 60 * 60 * 1000 &&
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
