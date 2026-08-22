import ical from "node-ical";
import { stableEventId } from "@/lib/events";
import type { EventItem, Source } from "@/lib/types";

export async function pullIcsSource(source: Source): Promise<EventItem[]> {
  if (!source.feed_url) return [];
  const res = await fetch(source.feed_url, {
    headers: {
      "User-Agent": "traverse.news-puller/1.0 (+https://traverse.news)",
    },
  });
  if (!res.ok) {
    throw new Error(`ICS fetch failed ${res.status} for ${source.name}`);
  }
  const text = await res.text();
  const parsed = ical.sync.parseICS(text);
  const now = Date.now();
  const horizon = now + 1000 * 60 * 60 * 24 * 45;
  const byId = new Map<string, EventItem>();

  for (const value of Object.values(parsed)) {
    if (!value || typeof value !== "object") continue;
    if (!("type" in value) || value.type !== "VEVENT") continue;
    const start = value.start ? new Date(value.start).getTime() : NaN;
    if (!Number.isFinite(start) || start < now - 1000 * 60 * 60 * 12 || start > horizon) {
      continue;
    }
    const title = String(value.summary ?? "").trim();
    if (!title) continue;
    const place = String(value.location ?? "").trim() || source.name;
    const url =
      typeof value.url === "string"
        ? value.url
        : source.homepage;
    const uid =
      typeof value.uid === "string" && value.uid.trim()
        ? value.uid.trim()
        : `${title}|${new Date(start).toISOString()}|${place}`;
    const id = stableEventId(source.id, uid);
    byId.set(id, {
      id,
      title,
      starts_at: new Date(start).toISOString(),
      place,
      url,
      source_id: source.id,
    });
  }

  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
}
