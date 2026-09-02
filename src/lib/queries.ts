import { dedupeEvents, eventInUpcomingWindow, isCivicEvent } from "@/lib/events";
import {
  getEmailSnapshot,
  getHomeSnapshot,
} from "@/lib/public-snapshots";
import type { EventItem } from "@/lib/types";
import { getTodaysWeatherLine } from "@/lib/weather";

export async function getHomepageData() {
  // Public homepage: one compact snapshot key. Clustering runs on write
  // (pull/import), not on every visitor GET. Weather is a second cheap
  // KV get (public:weather) — never an NWS fetch here.
  const [snap, weatherLine] = await Promise.all([
    getHomeSnapshot(),
    getTodaysWeatherLine().catch(() => null),
  ]);

  return {
    lead: snap.lead,
    around: snap.around,
    weekendEvents: snap.weekendEvents,
    civic: snap.civic,
    alerts: snap.alerts,
    weatherLine,
  };
}

export function civicEvents(
  events: EventItem[],
  sources: { id: string; beat_id: string }[],
  nowMs = Date.now(),
): EventItem[] {
  const now = new Date(nowMs);
  return dedupeEvents(events)
    .filter((e) => isCivicEvent(e, sources))
    .filter((e) => eventInUpcomingWindow(e, now));
}

/**
 * Live morning-email preview — compact public:email snapshot.
 * Does not invent copy; does not send mail; no full-store load on GET.
 * Overlays today’s cached weather when the letter row has none yet.
 */
export async function getEmailPreviewData() {
  const snap = await getEmailSnapshot();
  let letter = snap.letter;
  if (!letter.weather_line) {
    const line = await getTodaysWeatherLine().catch(() => null);
    if (line) letter = { ...letter, weather_line: line };
  }
  return { letter, live: true as const };
}
