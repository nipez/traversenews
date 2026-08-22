import { selectAroundTheBay } from "@/lib/around";
import { dedupeEvents } from "@/lib/events";
import { clusterStories } from "@/lib/pull/cluster";
import type {
  AppData,
  ClusteredStory,
  EditionEventCard,
  EditionSnapshot,
  EditionStoryCard,
  EventItem,
  Story,
} from "@/lib/types";

const DETROIT = "America/Detroit";

/** Calendar date YYYY-MM-DD in America/Detroit. */
export function detroitDateKey(at = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DETROIT,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

export function formatEditionLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  const utc = new Date(Date.UTC(y, m - 1, d, 17, 0, 0));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: DETROIT,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(utc);
}

function civicForEdition(
  events: EventItem[],
  sources: { id: string; beat_id: string }[],
  nowMs: number,
): EventItem[] {
  const civicBeats = new Set(["beat_government", "beat_schools"]);
  const civicSourceIds = new Set(
    sources.filter((s) => civicBeats.has(s.beat_id)).map((s) => s.id),
  );
  return dedupeEvents(events)
    .filter((e) => civicSourceIds.has(e.source_id))
    .filter((e) => new Date(e.starts_at).getTime() >= nowMs - 60 * 60 * 1000);
}

function toStoryCard(
  item: ClusteredStory | Story,
  sourcesFallback: string[] = ["traverse.news"],
): EditionStoryCard {
  const sources =
    "sources" in item && Array.isArray(item.sources)
      ? item.sources.map((s) => s.name)
      : sourcesFallback;
  return {
    title: item.title,
    dek: item.dek,
    url: item.url,
    published_at: item.published_at,
    sources,
    byline: item.byline,
    slug: item.slug,
    is_original: item.is_original,
  };
}

function toEventCard(e: {
  title: string;
  starts_at: string;
  place: string;
  url: string | null;
}): EditionEventCard {
  return {
    title: e.title,
    starts_at: e.starts_at,
    place: e.place,
    url: e.url,
  };
}

/**
 * Build the clustered homepage payload for an edition snapshot.
 * Uses `at` for the Detroit date key and for tonight/civic time windows.
 */
export function buildEditionSnapshot(
  data: AppData,
  at = new Date(),
): EditionSnapshot {
  const clusters = clusterStories(data.stories, data.sources);
  const originals = clusters.filter((c) => c.is_original);
  const aroundRail = selectAroundTheBay(
    clusters.filter((c) => !c.is_original),
    { limit: 13, maxPerSource: 3 },
  );
  const leadOriginal = originals[0] ?? null;
  // No staff original → lead with first mixed wire card (other-desk), never fake reporting.
  const wireLead = !leadOriginal && aroundRail[0] ? aroundRail[0] : null;
  const leadCluster = leadOriginal ?? wireLead;
  const around = wireLead ? aroundRail.slice(1, 13) : aroundRail.slice(0, 12);

  const weekendEvents = dedupeEvents(data.events)
    .filter((e) => {
      const t = new Date(e.starts_at).getTime();
      return (
        t >= at.getTime() - 60 * 60 * 1000 &&
        t <= at.getTime() + 3 * 24 * 60 * 60 * 1000
      );
    })
    .slice(0, 6);

  const civic = civicForEdition(data.events, data.sources, at.getTime()).slice(
    0,
    6,
  );

  return {
    date: detroitDateKey(at),
    captured_at: at.toISOString(),
    lead: leadCluster
      ? toStoryCard(
          leadCluster,
          leadCluster.is_original ? ["traverse.news"] : undefined,
        )
      : null,
    around: around.map((c) => toStoryCard(c)),
    events: weekendEvents.map(toEventCard),
    civic: civic.map(toEventCard),
  };
}

export function upsertEdition(
  editions: EditionSnapshot[],
  snapshot: EditionSnapshot,
): EditionSnapshot[] {
  const next = editions.filter((e) => e.date !== snapshot.date);
  next.push(snapshot);
  next.sort((a, b) => b.date.localeCompare(a.date));
  return next;
}

export function isValidEditionDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}
