import { selectAlerts } from "@/lib/alerts";
import { selectAroundTheBay } from "@/lib/around";
import {
  filterAthleticsSlate,
  isVarsityGameTitle,
  selectThisWeekAthletics,
} from "@/lib/athletics";
import {
  dedupeEvents,
  eventInUpcomingWindow,
  isCivicEvent,
  selectTonightEvents,
} from "@/lib/events";
import { isRecordEagleCluster } from "@/lib/paywall";
import { clusterStories } from "@/lib/pull/cluster";
import type {
  AppData,
  EmailAlertCard,
  EmailEditionSnapshot,
  EmailEventCard,
  EmailSportsCard,
  EmailStoryCard,
  EventItem,
} from "@/lib/types";

const DETROIT = "America/Detroit";

/** Soft ceiling so the letter archive cannot balloon KV. */
export const MAX_EMAIL_EDITIONS = 90;

/** Calendar date YYYY-MM-DD in America/Detroit. */
export function emailDetroitDateKey(at = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DETROIT,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

export function isValidEmailEditionDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export function formatEmailEditionLabel(dateKey: string): string {
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

export function upsertEmailEdition(
  editions: EmailEditionSnapshot[],
  snapshot: EmailEditionSnapshot,
): EmailEditionSnapshot[] {
  const next = editions.filter((e) => e.date !== snapshot.date);
  next.push(snapshot);
  next.sort((a, b) => b.date.localeCompare(a.date));
  return next.slice(0, MAX_EMAIL_EDITIONS);
}

function toAroundCard(
  cluster: Parameters<typeof isRecordEagleCluster>[0] & {
    title: string;
    dek: string;
    url: string;
    sources: Array<{ id: string; name: string }>;
  },
): EmailStoryCard {
  return {
    title: cluster.title,
    dek: cluster.dek,
    url: cluster.url,
    sources: cluster.sources.map((s) => s.name),
    paywalled: isRecordEagleCluster(cluster),
  };
}

function toEventCard(e: EventItem): EmailEventCard {
  const card: EmailEventCard = {
    title: e.title,
    starts_at: e.starts_at,
    place: e.place,
    url: e.url,
  };
  if (e.time_unknown) card.time_unknown = true;
  return card;
}

/**
 * Assemble the morning letter from the same live mix rules as /email preview.
 * Never invents stories, kickoffs, or meetings.
 */
export function buildEmailEditionSnapshot(
  data: AppData,
  at = new Date(),
): EmailEditionSnapshot {
  const clusters = clusterStories(data.stories, data.sources);
  const originals = clusters.filter((c) => c.is_original);
  const leadCluster = originals[0] ?? null;

  const aroundClusters = selectAroundTheBay(
    clusters.filter((c) => !c.is_original),
    { limit: 18, maxPerSource: 4, maxSports: 4, maxRecordEagle: 3 },
  );
  // 5–6 wire items; free desks already preferred by selectAroundTheBay.
  const around = aroundClusters.slice(0, 6).map(toAroundCard);

  const alerts: EmailAlertCard[] = selectAlerts(data.stories, data.sources, {
    limit: 2,
  }).map((a) => ({
    title: a.title,
    dek: a.dek,
    url: a.url,
    source_name: a.source_name,
  }));

  // Same featured pool as /whats-on (timed nights out — not library-first noon).
  const tonight = selectTonightEvents(data.events, data.sources, {
    now: at,
    limit: 3,
    horizonDays: 12,
    maxPerSource: 2,
    timedOnly: true,
  }).map(toEventCard);

  const civic = dedupeEvents(data.events)
    .filter((e) => isCivicEvent(e, data.sources))
    .filter((e) => eventInUpcomingWindow(e, at))
    .slice(0, 2)
    .map(toEventCard);

  const weekGames = filterAthleticsSlate(
    selectThisWeekAthletics(data.athletics ?? [], at),
    { includeSurrounding: false },
  );
  const varsity = weekGames.filter((g) => isVarsityGameTitle(g.title));
  const sportsPool = (varsity.length > 0 ? varsity : weekGames).slice(0, 4);
  const sports: EmailSportsCard[] = sportsPool.map((g) => {
    const card: EmailSportsCard = {
      title: g.title,
      starts_at: g.starts_at,
      place: g.place,
      url: g.url,
      school: g.school,
    };
    if (g.time_unknown) card.time_unknown = true;
    return card;
  });

  const lead: EmailStoryCard | null = leadCluster
    ? {
        title: leadCluster.title,
        dek: leadCluster.dek,
        url: leadCluster.url,
        sources: ["traverse.news"],
      }
    : null;

  return {
    date: emailDetroitDateKey(at),
    captured_at: at.toISOString(),
    lead,
    around,
    alerts,
    tonight,
    civic,
    sports,
  };
}
