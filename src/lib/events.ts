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

function looksLikeMeeting(title: string): boolean {
  const t = title.toLowerCase();
  return (
    t.includes("board study") ||
    t.includes("committee meeting") ||
    t.includes("board of education") ||
    t.includes("study session") ||
    t.includes("regular meeting") ||
    t.includes("commission") ||
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

/**
 * Tonight & this weekend: prefer concerts/community over school board stacks.
 * Mix desks; soft-cap civic/meeting items.
 */
export function selectTonightEvents(
  events: EventItem[],
  sources: Array<{ id: string; beat_id: string }>,
  options: {
    now?: Date;
    limit?: number;
    horizonDays?: number;
    maxMeetings?: number;
    maxPerSource?: number;
  } = {},
): EventItem[] {
  const now = options.now ?? new Date();
  const limit = options.limit ?? 6;
  const horizonDays = options.horizonDays ?? 4;
  const maxMeetings = options.maxMeetings ?? 1;
  const maxPerSource = options.maxPerSource ?? 2;
  const beatBySource = new Map(sources.map((s) => [s.id, s.beat_id]));

  const windowed = dedupeEvents(events).filter((e) => {
    const t = new Date(e.starts_at).getTime();
    return (
      t >= now.getTime() - 60 * 60 * 1000 &&
      t <= now.getTime() + horizonDays * 24 * 60 * 60 * 1000 &&
      !looksLikeLowValueListing(e.title)
    );
  });

  function score(e: EventItem): number {
    const beat = beatBySource.get(e.source_id) ?? "";
    let s = 0;
    if (beat === "beat_arts" || beat === "beat_events" || beat === "beat_sports") {
      s += 500;
    }
    if (CIVIC_BEATS.has(beat) || looksLikeMeeting(e.title)) s -= 400;
    if (looksLikeLowValueListing(e.title)) s -= 300;
    // sooner first within tier
    s -= new Date(e.starts_at).getTime() / 1e12;
    return s;
  }

  const ranked = [...windowed].sort((a, b) => score(b) - score(a));
  const picked: EventItem[] = [];
  const perSource = new Map<string, number>();
  let meetings = 0;

  for (const event of ranked) {
    if (picked.length >= limit) break;
    const srcCount = perSource.get(event.source_id) ?? 0;
    if (srcCount >= maxPerSource) continue;
    const meeting = looksLikeMeeting(event.title) ||
      CIVIC_BEATS.has(beatBySource.get(event.source_id) ?? "");
    if (meeting && meetings >= maxMeetings) continue;
    picked.push(event);
    perSource.set(event.source_id, srcCount + 1);
    if (meeting) meetings += 1;
  }

  // Soft fill from remaining ranked items (not raw chrono) if still short.
  if (picked.length < limit) {
    for (const event of ranked) {
      if (picked.length >= limit) break;
      if (picked.some((p) => p.id === event.id)) continue;
      const srcCount = perSource.get(event.source_id) ?? 0;
      if (srcCount >= maxPerSource) continue;
      const meeting =
        looksLikeMeeting(event.title) ||
        CIVIC_BEATS.has(beatBySource.get(event.source_id) ?? "");
      if (meeting && meetings >= maxMeetings) continue;
      picked.push(event);
      perSource.set(event.source_id, srcCount + 1);
      if (meeting) meetings += 1;
    }
  }

  return picked.sort(
    (a, b) =>
      new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
}
