import { selectAroundTheBay } from "@/lib/around";
import { selectAlerts } from "@/lib/alerts";
import { dedupeEvents, eventInUpcomingWindow, isCivicEvent, selectTonightEvents } from "@/lib/events";
import { buildEmailEditionSnapshot } from "@/lib/email-editions";
import { clusterStories } from "@/lib/pull/cluster";
import {
  getAppData,
  repairPublishedOriginalStories,
} from "@/lib/data/store";
import type { ClusteredStory, EventItem, Story } from "@/lib/types";

export async function getHomepageData() {
  await repairPublishedOriginalStories();
  const data = await getAppData();
  const clusters = clusterStories(data.stories, data.sources);
  const originals = clusters.filter((c) => c.is_original);
  const around = selectAroundTheBay(
    clusters.filter((c) => !c.is_original),
    { limit: 18, maxPerSource: 4, maxSports: 4, maxRecordEagle: 3, maxUpNorth: 3 },
  );
  // Hero is staff originals only — never promote other-desk crime/wire to the lead.
  const lead = originals[0] ?? null;

  const moreFromUs = data.stories
    .filter((s) => s.is_original)
    .filter((s) => !lead || s.slug !== lead.slug)
    .sort(
      (a, b) =>
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
    )
    .slice(0, 3);

  const weekendEvents = selectTonightEvents(data.events, data.sources, {
    limit: 6,
    horizonDays: 5,
    maxPerSource: 3,
    timedOnly: true,
  });

  const civic = civicEvents(data.events, data.sources).slice(0, 6);
  const alerts = selectAlerts(data.stories, data.sources, { limit: 3 });

  return {
    data,
    lead: lead as ClusteredStory | Story | null,
    around,
    moreFromUs,
    weekendEvents,
    civic,
    alerts,
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
 * Live morning-email preview — same mix as a captured letter snapshot.
 * Does not invent copy; does not send mail.
 */
export async function getEmailPreviewData() {
  await repairPublishedOriginalStories();
  const data = await getAppData();
  const letter = buildEmailEditionSnapshot(data);
  return { letter, live: true as const };
}
