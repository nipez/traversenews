import { selectAlerts } from "@/lib/alerts";
import { selectAroundTheBay } from "@/lib/around";
import {
  athleticsSchoolLabel,
  filterAthleticsSlate,
  isVarsityGameTitle,
  selectThisWeekAthletics,
} from "@/lib/athletics";
import { detroitDayKey, detroitWallToUtc } from "@/lib/dates";
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
  EditionSnapshot,
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

/**
 * Prefer at least this many new Around-the-bay cards. Below that, ship a
 * shorter letter — never pad with yesterday’s heads.
 */
export const LETTER_AROUND_MIN_FRESH = 4;

/** Soft ceiling for bay cards in one morning letter. */
export const LETTER_AROUND_MAX = 6;

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

/**
 * Add Detroit calendar days to a YYYY-MM-DD key (noon Detroit anchor — DST-safe
 * day step only, not a showtime).
 */
export function addDetroitCalendarDays(
  dayKey: string,
  daysToAdd: number,
): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  if (!y || !m || !d) return dayKey;
  const noon = detroitWallToUtc(y, m, d, 12, 0, 0);
  return detroitDayKey(
    new Date(noon.getTime() + daysToAdd * 24 * 60 * 60 * 1000),
  );
}

function normalizeLetterUrl(url: string | null | undefined): string {
  if (!url) return "";
  try {
    const u = new URL(url.trim());
    u.hash = "";
    let path = u.pathname.replace(/\/+$/, "") || "/";
    return `${u.protocol}//${u.hostname.toLowerCase()}${path}${u.search}`.toLowerCase();
  } catch {
    return url.trim().replace(/\/+$/, "").toLowerCase();
  }
}

function normalizeLetterHeadline(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Stable identity for letter cards: URL when present, else headline. */
export function letterCardIdentity(item: {
  title: string;
  url?: string | null;
}): string {
  const url = normalizeLetterUrl(item.url);
  if (url) return `url:${url}`;
  return `title:${normalizeLetterHeadline(item.title)}`;
}

function addIdentity(set: Set<string>, item: { title: string; url?: string | null }) {
  const id = letterCardIdentity(item);
  if (id !== "url:" && id !== "title:") set.add(id);
  const titleKey = `title:${normalizeLetterHeadline(item.title)}`;
  if (titleKey !== "title:") set.add(titleKey);
}

/**
 * Collect URL + headline identities from yesterday’s published letter only
 * so today’s letter can drop anything already emailed. Homepage edition bay
 * cards that never made the letter are not excluded here.
 */
export function collectPriorLetterIdentities(
  priorLetter: EmailEditionSnapshot | null | undefined,
): Set<string> {
  const set = new Set<string>();

  if (priorLetter) {
    if (priorLetter.lead) addIdentity(set, priorLetter.lead);
    for (const card of priorLetter.around) addIdentity(set, card);
    for (const card of priorLetter.alerts) addIdentity(set, card);
    for (const card of priorLetter.tonight) addIdentity(set, card);
    for (const card of priorLetter.civic) addIdentity(set, card);
    for (const card of priorLetter.sports) addIdentity(set, card);
  }

  return set;
}

export function wasInPriorLetter(
  item: { title: string; url?: string | null },
  prior: Set<string>,
): boolean {
  if (prior.size === 0) return false;
  const url = normalizeLetterUrl(item.url);
  if (url && prior.has(`url:${url}`)) return true;
  const titleKey = `title:${normalizeLetterHeadline(item.title)}`;
  return titleKey !== "title:" && prior.has(titleKey);
}

export function findPriorDetroitDaySnapshot<T extends { date: string }>(
  snapshots: T[] | null | undefined,
  at: Date,
): T | null {
  if (!snapshots?.length) return null;
  const yesterday = addDetroitCalendarDays(emailDetroitDateKey(at), -1);
  return snapshots.find((s) => s.date === yesterday) ?? null;
}

/**
 * Bay/lead identities from editions older than yesterday (2+ Detroit days
 * back). Used to age the homepage / edition pile without inventing stories.
 */
export function collectStaleEditionBayIdentities(
  editions: EditionSnapshot[] | null | undefined,
  at: Date,
): Set<string> {
  const cutoff = addDetroitCalendarDays(emailDetroitDateKey(at), -1);
  const set = new Set<string>();
  for (const edition of editions ?? []) {
    if (edition.date >= cutoff) continue;
    if (edition.lead) addIdentity(set, edition.lead);
    for (const card of edition.around) addIdentity(set, card);
  }
  return set;
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
 * Pick Around-the-bay cards that did not run yesterday.
 * Prefer a full slate; if fewer than LETTER_AROUND_MIN_FRESH are new, return
 * the short fresh list — never pad with yesterday’s heads.
 */
export function pickFreshAroundForLetter<
  T extends { title: string; url: string },
>(candidates: T[], prior: Set<string>, max = LETTER_AROUND_MAX): T[] {
  const fresh = candidates.filter((c) => !wasInPriorLetter(c, prior));
  return fresh.slice(0, max);
}

/**
 * Assemble the morning letter from the same live mix rules as /email preview.
 * Drops URL/headline matches from yesterday’s published letter only. Never
 * invents stories, kickoffs, or meetings.
 */
export function buildEmailEditionSnapshot(
  data: AppData,
  at = new Date(),
): EmailEditionSnapshot {
  const priorLetter = findPriorDetroitDaySnapshot(data.email_editions, at);
  const prior = collectPriorLetterIdentities(priorLetter);

  const clusters = clusterStories(data.stories, data.sources);
  const originals = clusters.filter((c) => c.is_original);
  const leadCluster = originals[0] ?? null;

  // Pull a wide pool, then keep only cards that did not run yesterday.
  // Record-Eagle hard-paywall cap stays at 2.
  const aroundClusters = selectAroundTheBay(
    clusters.filter((c) => !c.is_original),
    { limit: 24, maxPerSource: 4, maxSports: 4, maxRecordEagle: 2 },
  );
  const around = pickFreshAroundForLetter(
    aroundClusters.map(toAroundCard),
    prior,
    LETTER_AROUND_MAX,
  );

  const alerts: EmailAlertCard[] = selectAlerts(data.stories, data.sources, {
    limit: 4,
  })
    .map((a) => ({
      title: a.title,
      dek: a.dek,
      url: a.url,
      source_name: a.source_name,
    }))
    .filter((a) => !wasInPriorLetter(a, prior))
    .slice(0, 2);

  // Same featured pool as /whats-on (timed nights out — not library-first noon).
  const tonight = selectTonightEvents(data.events, data.sources, {
    now: at,
    limit: 6,
    horizonDays: 12,
    maxPerSource: 2,
    timedOnly: true,
  })
    .map(toEventCard)
    .filter((e) => !wasInPriorLetter(e, prior))
    .slice(0, 3);

  const civic = dedupeEvents(data.events)
    .filter((e) => isCivicEvent(e, data.sources))
    .filter((e) => eventInUpcomingWindow(e, at))
    .map(toEventCard)
    .filter((e) => !wasInPriorLetter(e, prior))
    .slice(0, 2);

  const weekGames = filterAthleticsSlate(
    selectThisWeekAthletics(data.athletics ?? [], at),
    { includeSurrounding: false },
  );
  const varsity = weekGames.filter((g) => isVarsityGameTitle(g.title));
  const sportsPool = (varsity.length > 0 ? varsity : weekGames).slice(0, 8);
  const sports: EmailSportsCard[] = sportsPool
    .map((g) => {
      const card: EmailSportsCard = {
        title: g.title,
        starts_at: g.starts_at,
        place: g.place,
        url: g.url,
        school: athleticsSchoolLabel(g),
      };
      if (g.time_unknown) card.time_unknown = true;
      return card;
    })
    .filter((g) => !wasInPriorLetter(g, prior))
    .slice(0, 4);

  const lead: EmailStoryCard | null =
    leadCluster && !wasInPriorLetter(leadCluster, prior)
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
