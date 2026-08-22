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
