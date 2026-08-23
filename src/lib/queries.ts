import { detroitYesterdayKey } from "@/lib/dates";
import { dedupeEvents, eventInUpcomingWindow, isCivicEvent } from "@/lib/events";
import {
  getEmailSnapshot,
  getEditionsSnapshot,
  getHomeSnapshot,
} from "@/lib/public-snapshots";
import type { EventItem } from "@/lib/types";

export async function getHomepageData() {
  // Public homepage: home snapshot + optional editions snapshot for Yesterday.
  // Clustering runs on write (pull/import), not on every visitor GET.
  // Never kv.list — only well-known public keys.
  const [snap, editionsSnap] = await Promise.all([
    getHomeSnapshot(),
    getEditionsSnapshot(),
  ]);

  const yesterdayKey = detroitYesterdayKey();
  const yesterdayEditionDate = editionsSnap.editions.some(
    (e) => e.date === yesterdayKey,
  )
    ? yesterdayKey
    : null;

  return {
    lead: snap.lead,
    around: snap.around,
    weekendEvents: snap.weekendEvents,
    civic: snap.civic,
    alerts: snap.alerts,
    yesterdayEditionDate,
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
