import ical from "node-ical";
import { detroitWallToUtc } from "@/lib/dates";
import { stableEventId } from "@/lib/events";
import { getSite } from "@/lib/sites";
import type { EventItem, Source } from "@/lib/types";

function isIcsDateOnly(value: {
  datetype?: string;
  type?: string;
}): boolean {
  return value.datetype === "date";
}

/**
 * Parse a VCALENDAR body into EventItems.
 * VALUE=DATE (all-day) → midnight America/Detroit + time_unknown.
 * Never treat midnight UTC as 8:00 PM Detroit.
 */
export function eventsFromIcsText(
  text: string,
  source: Source,
  now = new Date(),
): EventItem[] {
  const parsed = ical.sync.parseICS(text);
  const nowMs = now.getTime();
  const horizon = nowMs + 1000 * 60 * 60 * 24 * 45;
  const byId = new Map<string, EventItem>();

  for (const value of Object.values(parsed)) {
    if (!value || typeof value !== "object") continue;
    if (!("type" in value) || value.type !== "VEVENT") continue;
    if (!value.start) continue;
    const rawStart = new Date(value.start);
    if (Number.isNaN(rawStart.getTime())) continue;

    const dateOnly = isIcsDateOnly(value);
    let starts: Date;
    if (dateOnly) {
      starts = detroitWallToUtc(
        rawStart.getUTCFullYear(),
        rawStart.getUTCMonth() + 1,
        rawStart.getUTCDate(),
        0,
        0,
        0,
      );
    } else {
      starts = rawStart;
    }

    const startMs = starts.getTime();
    if (!Number.isFinite(startMs) || startMs < nowMs - 1000 * 60 * 60 * 12 || startMs > horizon) {
      continue;
    }
    const title = String(value.summary ?? "").trim();
    if (!title) continue;
    const place = String(value.location ?? "").trim() || source.name;
    const url = typeof value.url === "string" ? value.url : source.homepage;
    const uid =
      typeof value.uid === "string" && value.uid.trim()
        ? value.uid.trim()
        : `${title}|${starts.toISOString()}|${place}`;
    const id = stableEventId(source.id, uid);
    const item: EventItem = {
      id,
      title,
      starts_at: starts.toISOString(),
      place,
      url,
      source_id: source.id,
    };
    if (dateOnly) item.time_unknown = true;
    byId.set(id, item);
  }

  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
}

export async function pullIcsSource(source: Source): Promise<EventItem[]> {
  if (!source.feed_url) return [];
  const res = await fetch(source.feed_url, {
    headers: {
      "User-Agent": getSite().userAgent,
    },
  });
  if (!res.ok) {
    throw new Error(`ICS fetch failed ${res.status} for ${source.name}`);
  }
  return eventsFromIcsText(await res.text(), source);
}
