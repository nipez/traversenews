import { selectAlerts } from "@/lib/alerts";
import { looksLikeHardNews, selectAroundTheBay } from "@/lib/around";
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
  ClusteredStory,
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

/**
 * Prefer at least this many new homepage / edition bay cards. Below that,
 * ship a shorter bay — never pad with yesterday’s heads.
 */
export const BAY_AROUND_MIN_FRESH = 8;

/** Soft ceiling for Around-the-bay cards on homepage / dated editions. */
export const BAY_AROUND_MAX = 18;

/** Wide candidate pool so scored top-24 cannot trap the bay in yesterday’s pile. */
export const BAY_CANDIDATE_POOL = 48;

/** Lead + around shape shared by letter and homepage edition snapshots. */
export type PriorBayCards = {
  lead?: { title: string; url?: string | null } | null;
  around?: Array<{ title: string; url?: string | null }>;
} | null | undefined;

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
 * Collect URL + headline identities from a prior edition’s lead + Around the
 * bay only (not events/civic). Used so today’s homepage / dated edition can
 * drop anything that already ran yesterday.
 */
export function collectPriorEditionBayIdentities(
  priorEdition: PriorBayCards,
): Set<string> {
  const set = new Set<string>();
  if (!priorEdition) return set;
  if (priorEdition.lead) addIdentity(set, priorEdition.lead);
  for (const card of priorEdition.around ?? []) addIdentity(set, card);
  return set;
}

/**
 * Collect URL + headline identities from yesterday’s published letter only
 * so today’s letter can drop anything already emailed. Homepage edition bay
 * cards that never made the letter are not excluded here (multi-day leftovers
 * that sat on 2+ older edition days are separate via
 * collectStaleEditionBayIdentities).
 */
export function collectPriorLetterIdentities(
  priorLetter: EmailEditionSnapshot | null | undefined,
): Set<string> {
  const set = collectPriorEditionBayIdentities(priorLetter);

  if (priorLetter) {
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

function titleTokens(title: string): Set<string> {
  return new Set(
    normalizeLetterHeadline(title)
      .replace(/(ies)\b/g, "y")
      .replace(/(ses|xes|zes|ches|shes)\b/g, "")
      .replace(/s\b/g, "")
      .split(/\s+/)
      .filter((t) => t.length > 2),
  );
}

function tokenJaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** Boardman / sewage advisory spill — same incident across desks. */
function looksLikeBoardmanSewageAdvisory(title: string): boolean {
  const t = title.toLowerCase();
  const advisoryOrSpill =
    /advisory|sewage|spill|no[- ]?body[- ]contact/.test(t);
  if (!advisoryOrSpill) return false;
  return /boardman|sewage|level\s*[24]\s*advisory|no[- ]?body[- ]contact/.test(
    t,
  );
}

/**
 * True when two headlines are likely the same story (exact, cluster-strength
 * overlap, or a second-desk rewrite with the same key nouns).
 */
export function titlesLikelySameStory(a: string, b: string): boolean {
  const na = normalizeLetterHeadline(a);
  const nb = normalizeLetterHeadline(b);
  if (!na || !nb) return false;
  if (na === nb) return true;

  // Same Boardman sewage advisory from two desks → one card.
  if (looksLikeBoardmanSewageAdvisory(a) && looksLikeBoardmanSewageAdvisory(b)) {
    return true;
  }

  const ta = titleTokens(a);
  const tb = titleTokens(b);
  const overlap = tokenJaccard(ta, tb);
  if (overlap >= 0.62) return true;

  let shared = 0;
  let distinctiveShared = false;
  for (const t of ta) {
    if (!tb.has(t)) continue;
    shared += 1;
    if (t.length >= 8) distinctiveShared = true;
  }
  // "moratorium" + "data" + "center" style rewrites across desks.
  if (shared >= 3 && overlap >= 0.35) return true;
  return shared >= 2 && distinctiveShared && overlap >= 0.4;
}

function clusterMembers(
  cluster: ClusteredStory,
): Array<{ title: string; url: string }> {
  if (cluster.members?.length) return cluster.members;
  return [{ title: cluster.title, url: cluster.url }];
}

function clusterHitsExcluded(
  cluster: ClusteredStory,
  excluded: Set<string>,
  priorTitles: string[],
): boolean {
  const members = clusterMembers(cluster);
  for (const member of members) {
    if (wasInPriorLetter(member, excluded)) return true;
    for (const priorTitle of priorTitles) {
      if (titlesLikelySameStory(priorTitle, member.title)) return true;
    }
  }
  if (wasInPriorLetter(cluster, excluded)) return true;
  for (const priorTitle of priorTitles) {
    if (titlesLikelySameStory(priorTitle, cluster.title)) return true;
  }
  return false;
}

/**
 * When a prior-letter / prior-edition (or stale) identity hits a cluster by
 * URL / title / rewrite-similarity, exclude every member URL + title so a
 * second desk cannot follow the next day.
 */
export function expandExcludedWithClusterMembers(
  excluded: Set<string>,
  clusters: ClusteredStory[],
  priorCards?: PriorBayCards,
): Set<string> {
  const next = new Set(excluded);
  const priorTitles: string[] = [];
  if (priorCards?.lead?.title) priorTitles.push(priorCards.lead.title);
  for (const card of priorCards?.around ?? []) {
    if (card.title) priorTitles.push(card.title);
  }

  let grew = true;
  while (grew) {
    grew = false;
    for (const cluster of clusters) {
      if (!clusterHitsExcluded(cluster, next, priorTitles)) continue;
      for (const member of clusterMembers(cluster)) {
        const before = next.size;
        addIdentity(next, member);
        if (next.size > before) grew = true;
      }
      addIdentity(next, cluster);
    }
  }

  return next;
}

export function mergeIdentitySets(...sets: Set<string>[]): Set<string> {
  const next = new Set<string>();
  for (const set of sets) {
    for (const value of set) next.add(value);
  }
  return next;
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
 * How many Detroit calendar days of prior morning letters to exclude when
 * assembling today’s letter. Tuesday mailing must still see Saturday’s heads
 * (Sat–Mon), not only Monday.
 */
export const RECENT_LETTER_LOOKBACK_DAYS = 4;

/** Prefer at least this many prior editions when the calendar window is thin. */
export const RECENT_LETTER_MIN_EDITIONS = 3;

/**
 * Prior morning letters whose heads must not repeat today. Looks back
 * RECENT_LETTER_LOOKBACK_DAYS Detroit days, and fills to at least
 * RECENT_LETTER_MIN_EDITIONS older editions when available (weekends empty).
 */
export function findRecentEmailEditions(
  editions: EmailEditionSnapshot[] | null | undefined,
  at: Date,
  options: { lookbackDays?: number; minEditions?: number } = {},
): EmailEditionSnapshot[] {
  const lookbackDays = options.lookbackDays ?? RECENT_LETTER_LOOKBACK_DAYS;
  const minEditions = options.minEditions ?? RECENT_LETTER_MIN_EDITIONS;
  const today = emailDetroitDateKey(at);
  const oldest = addDetroitCalendarDays(today, -lookbackDays);
  const prior = [...(editions ?? [])]
    .filter((e) => e.date < today)
    .sort((a, b) => b.date.localeCompare(a.date));
  const inWindow = prior.filter((e) => e.date >= oldest);
  if (inWindow.length >= minEditions) return inWindow;
  return prior.slice(0, Math.max(inWindow.length, Math.min(minEditions, prior.length)));
}

/**
 * Merge URL / headline identities (and bay titles for rewrite matching) from
 * every recent morning letter so Saturday’s Garfield ban cannot return Tuesday.
 */
export function collectRecentLetterIdentities(
  editions: EmailEditionSnapshot[] | null | undefined,
  at: Date,
): { identities: Set<string>; titles: string[]; letters: EmailEditionSnapshot[] } {
  const letters = findRecentEmailEditions(editions, at);
  const identities = new Set<string>();
  const titles: string[] = [];
  for (const letter of letters) {
    for (const id of collectPriorLetterIdentities(letter)) {
      identities.add(id);
    }
    if (letter.lead?.title) titles.push(letter.lead.title);
    for (const card of letter.around ?? []) {
      if (card.title) titles.push(card.title);
    }
  }
  return { identities, titles, letters };
}

/**
 * Bay/lead identities that sat on the homepage for multiple Detroit days
 * (appeared on 2+ dated editions older than yesterday). One-shot cards from
 * older days stay eligible so a full yesterday does not empty today’s bay.
 * Do not permanently ban every card that ever ran on any dated edition.
 */
export function collectStaleEditionBayIdentities(
  editions: EditionSnapshot[] | null | undefined,
  at: Date,
): Set<string> {
  const cutoff = addDetroitCalendarDays(emailDetroitDateKey(at), -1);
  const dayCounts = new Map<string, number>();

  for (const edition of editions ?? []) {
    if (edition.date >= cutoff) continue;
    const seenThisDay = new Set<string>();
    const addDayIdentity = (item: { title: string; url?: string | null }) => {
      const url = normalizeLetterUrl(item.url);
      if (url) seenThisDay.add(`url:${url}`);
      const titleKey = `title:${normalizeLetterHeadline(item.title)}`;
      if (titleKey !== "title:") seenThisDay.add(titleKey);
    };
    if (edition.lead) addDayIdentity(edition.lead);
    for (const card of edition.around) addDayIdentity(card);
    for (const id of seenThisDay) {
      dayCounts.set(id, (dayCounts.get(id) ?? 0) + 1);
    }
  }

  const set = new Set<string>();
  for (const [id, days] of dayCounts) {
    if (days >= 2) set.add(id);
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
 * Prefer a full slate; if fewer than the soft minimum are new, return the
 * short fresh list — never pad with yesterday’s heads. Collapse same-story
 * second-desk rewrites (and Boardman sewage pairs) within the slate.
 */
export function pickFreshAroundForLetter<
  T extends { title: string; url: string },
>(candidates: T[], prior: Set<string>, max = LETTER_AROUND_MAX): T[] {
  const out: T[] = [];
  for (const candidate of candidates) {
    if (wasInPriorLetter(candidate, prior)) continue;
    if (out.some((picked) => titlesLikelySameStory(picked.title, candidate.title))) {
      continue;
    }
    out.push(candidate);
    if (out.length >= max) break;
  }
  return out;
}

function priorBayTitles(priorCards: PriorBayCards): string[] {
  const titles: string[] = [];
  if (priorCards?.lead?.title) titles.push(priorCards.lead.title);
  for (const card of priorCards?.around ?? []) {
    if (card.title) titles.push(card.title);
  }
  return titles;
}

/**
 * Homepage / dated-edition Around the bay: drop yesterday’s edition cards
 * only (URL / normalized title / same-story rewrite). Do not ban the whole
 * older edition archive — one-shot cards from earlier days stay eligible so
 * Saturday can fill after a full Friday. Multi-day leftovers for the letter
 * stay in collectStaleEditionBayIdentities. 14-day max age lives in around.ts.
 * Staff originals are not passed in (lead is separate).
 */
export function selectFreshAroundTheBay(
  clusters: ClusteredStory[],
  editions: EditionSnapshot[] | null | undefined,
  at: Date,
  options: { maxUpNorth?: number } = {},
): ClusteredStory[] {
  const priorEdition = findPriorDetroitDaySnapshot(editions, at);
  const priorBay = collectPriorEditionBayIdentities(priorEdition);
  const bayExclude = expandExcludedWithClusterMembers(
    priorBay,
    clusters,
    priorEdition,
  );
  const priorTitles = priorBayTitles(priorEdition);

  // Rank unused stories first — do not score a top-48 that is mostly Friday.
  const unused = clusters.filter(
    (c) =>
      !c.is_original && !clusterHitsExcluded(c, bayExclude, priorTitles),
  );

  const candidates = selectAroundTheBay(unused, {
    limit: BAY_CANDIDATE_POOL,
    maxPerSource: 3,
    maxSports: 4,
    maxRecordEagle: 2,
    maxHeavyWire: 2,
    maxEyesOnly: 2,
    maxUpNorth: options.maxUpNorth ?? 3,
    now: at,
  });

  return pickFreshAroundForLetter(candidates, bayExclude, BAY_AROUND_MAX);
}

/**
 * Assemble the morning letter from the same live mix rules as /email preview.
 *
 * Uniqueness:
 * - Recent published letters (last several Detroit days / editions), not only
 *   yesterday — Saturday’s heads must not return Tuesday.
 * - Soft/recap cards that sat on the homepage for 2+ older edition days stay
 *   out (weekly leftovers). Hard news that never mailed stays eligible even
 *   if it lingered on the bay.
 * - When a prior identity hits a cluster, every member URL/title is excluded
 *   so a second-desk rewrite cannot follow.
 *
 * Never invents stories, kickoffs, or meetings.
 */
export function buildEmailEditionSnapshot(
  data: AppData,
  at = new Date(),
  options: {
    weather_line?: string | null;
    /** Preserve Desk subject when pull/snapshot rebuilds the letter. */
    subject_override?: string | null;
  } = {},
): EmailEditionSnapshot {
  const {
    identities: prior,
    titles: priorTitles,
    letters: recentLetters,
  } = collectRecentLetterIdentities(data.email_editions, at);
  const staleBay = collectStaleEditionBayIdentities(data.editions, at);

  const clusters = clusterStories(data.stories, data.sources);
  // Flatten recent lead+around into one PriorBayCards shape for rewrite expand.
  const recentBayCards: PriorBayCards = {
    lead: null,
    around: recentLetters.flatMap((letter) => {
      const cards: Array<{ title: string; url?: string | null }> = [];
      if (letter.lead) cards.push(letter.lead);
      for (const card of letter.around ?? []) cards.push(card);
      return cards;
    }),
  };
  const priorExpanded = expandExcludedWithClusterMembers(
    prior,
    clusters,
    recentBayCards,
  );
  const staleExpanded = expandExcludedWithClusterMembers(
    staleBay,
    clusters,
    // Stale set is edition identities, not a prior letter snapshot.
    null,
  );

  const originals = clusters.filter((c) => c.is_original);
  const leadCluster = originals[0] ?? null;

  // Prior letters block everyone. Stale homepage aging only blocks soft
  // leftovers — unused hard news may still take a letter slot.
  const unused = clusters.filter((c) => {
    if (c.is_original) return false;
    if (clusterHitsExcluded(c, priorExpanded, priorTitles)) return false;
    if (looksLikeHardNews(c)) return true;
    return !clusterHitsExcluded(c, staleExpanded, []);
  });
  const aroundClusters = selectAroundTheBay(unused, {
    limit: 24,
    maxPerSource: 3,
    maxSports: 0,
    maxRecordEagle: 2,
    maxHeavyWire: 2,
    maxEyesOnly: 2,
    preferHardNews: true,
    now: at,
  });
  // Freshness vs recent letters (hard news may be bay-stale).
  const around = pickFreshAroundForLetter(
    aroundClusters.map(toAroundCard),
    priorExpanded,
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
    .filter((a) => !wasInPriorLetter(a, priorExpanded))
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
    .filter((e) => !wasInPriorLetter(e, priorExpanded))
    .slice(0, 3);

  const civic = dedupeEvents(data.events)
    .filter((e) => isCivicEvent(e, data.sources))
    .filter((e) => eventInUpcomingWindow(e, at))
    .map(toEventCard)
    .filter((e) => !wasInPriorLetter(e, priorExpanded))
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
    .filter((g) => !wasInPriorLetter(g, priorExpanded))
    .slice(0, 4);

  const lead: EmailStoryCard | null =
    leadCluster && !wasInPriorLetter(leadCluster, priorExpanded)
      ? {
          title: leadCluster.title,
          dek: leadCluster.dek,
          url: leadCluster.url,
          sources: [],
          desk_original: false,
        }
      : null;

  const subject_override =
    typeof options.subject_override === "string" &&
    options.subject_override.trim()
      ? options.subject_override.trim()
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
    weather_line: options.weather_line ?? null,
    subject_override,
  };
}
