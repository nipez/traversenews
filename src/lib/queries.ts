import { dedupeEvents, eventInUpcomingWindow, isCivicEvent } from "@/lib/events";
import {
  getEmailSnapshot,
  getHomeSnapshot,
} from "@/lib/public-snapshots";
import type { EventItem } from "@/lib/types";

export async function getHomepageData() {
  // Public homepage: one compact snapshot key. Clustering runs on write
  // (pull/import), not on every visitor GET.
  const snap = await getHomeSnapshot();

  return {
    lead: snap.lead,
    around: snap.around,
    weekendEvents: snap.weekendEvents,
    civic: snap.civic,
    alerts: snap.alerts,
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
 */
export async function getEmailPreviewData() {
  const snap = await getEmailSnapshot();
  return { letter: snap.letter, live: true as const };
}
