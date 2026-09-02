import {
  selectFreshAroundTheBay,
} from "@/lib/email-editions";
import {
  dedupeEvents,
  eventInUpcomingWindow,
  isCivicEvent,
  selectTonightEvents,
} from "@/lib/events";
import { getPublicOriginalByline } from "@/lib/originals";
import { siteWordmark } from "@/lib/sites";
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
  const now = new Date(nowMs);
  return dedupeEvents(events)
    .filter((e) => isCivicEvent(e, sources))
    .filter((e) => eventInUpcomingWindow(e, now));
}

function toStoryCard(
  item: ClusteredStory | Story,
  sourcesFallback?: string[],
): EditionStoryCard {
  const sources =
    "sources" in item && Array.isArray(item.sources)
      ? item.sources.map((s) => s.name)
      : sourcesFallback ?? [siteWordmark()];
  return {
    title: item.title,
    dek: item.dek,
    url: item.url,
    published_at: item.published_at,
    sources,
    byline: item.is_original ? getPublicOriginalByline() : item.byline,
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
  // Drop yesterday’s edition bay heads only (not the whole older archive).
  // Staff originals only for the lead — never invent a lead or promote wire
  // into it. Keep today’s original even if the same piece also ran yesterday.
  const around = selectFreshAroundTheBay(clusters, data.editions, at);
  const leadCluster = originals[0] ?? null;

  const weekendEvents = selectTonightEvents(data.events, data.sources, {
    now: at,
    limit: 6,
    horizonDays: 5,
    maxPerSource: 3,
  });

  const civic = civicForEdition(data.events, data.sources, at.getTime()).slice(
    0,
    6,
  );

  return {
    date: detroitDateKey(at),
    captured_at: at.toISOString(),
    lead: leadCluster
      ? toStoryCard(leadCluster, [siteWordmark()])
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
