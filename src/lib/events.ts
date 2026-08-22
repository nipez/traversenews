import type { EventItem } from "@/lib/types";

/** Stable fingerprint for the same meeting across pulls / feeds. */
export function eventDedupeKey(event: {
  title: string;
  starts_at: string;
  place: string;
  source_id?: string;
}): string {
  const start = new Date(event.starts_at);
  const minute = Number.isNaN(start.getTime())
    ? event.starts_at
    : start.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
  return [
    event.title.trim().toLowerCase().replace(/\s+/g, " "),
    minute,
    event.place.trim().toLowerCase().replace(/\s+/g, " "),
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
 * Keep one row per title+start+place. Prefers earlier source order / first seen.
 */
export function dedupeEvents(events: EventItem[]): EventItem[] {
  const byKey = new Map<string, EventItem>();
  for (const event of events) {
    const key = eventDedupeKey(event);
    if (!byKey.has(key)) byKey.set(key, event);
  }
  return Array.from(byKey.values()).sort(
    (a, b) =>
      new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
}
