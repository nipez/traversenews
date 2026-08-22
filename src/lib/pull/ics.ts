import ical from "node-ical";
import { newId } from "@/lib/ids";
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
  const events: EventItem[] = [];

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
    events.push({
      id: newId("evt"),
      title,
      starts_at: new Date(start).toISOString(),
      place,
      url,
      source_id: source.id,
    });
  }

  return events.sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
}
