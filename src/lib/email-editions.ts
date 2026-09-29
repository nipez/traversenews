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
import { sanitizePublicText } from "@/lib/text-encoding";
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
    const path = u.pathname.replace(/\/+$/, "") || "/";
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
 * Collect URL + headline identities from yesterday’s published letter only.
 * Prefer collectPastBayExclusion for auto mix — that covers every past letter
 * and homepage edition (including Cadillac News / Benzie and other non-Desk feeds).
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
 * assembling today’s letter. Kept for callers/tests that still want a short
 * window; auto mix now uses the full letter + homepage archive instead.
 */
export const RECENT_LETTER_LOOKBACK_DAYS = 4;

/** Prefer at least this many prior editions when the calendar window is thin. */
export const RECENT_LETTER_MIN_EDITIONS = 3;

/**
 * Same-story rewrite lookback (Detroit calendar days). Exact URL / normalized
 * title matches ban forever (while the archive still holds them); fuzzy
 * second-outlet rewrites only match inside this window.
 */
export const SAME_STORY_LOOKBACK_DAYS = 21;

/** One prior bay/lead card from a letter or homepage edition archive. */
export type PastBayCard = {
  date: string;
  kind: "letter" | "homepage";
  title: string;
  url?: string | null;
};

/**
 * Complete auto-mix exclusion corpus: every lead + Around card from every
 * stored morning letter and homepage edition older than today. Alerts /
 * tonight / civic / sports on letters are included so a mailed alert head
 * cannot resurface as an Around card. Cadillac News / Benzie Record Patriot
 * and other non-Desk outlets count the same as Desk-picked cards.
 */
export type PastBayExclusion = {
  identities: Set<string>;
  /** Cards inside SAME_STORY_LOOKBACK_DAYS for rewrite matching. */
  recentCards: PastBayCard[];
  /** All prior bay/lead cards (identity source of truth). */
  allCards: PastBayCard[];
};

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
 * Prefer collectPastBayExclusion for auto mix — that also covers homepage editions.
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
 * (appeared on 2+ dated editions older than yesterday). Retained for tests /
 * diagnostics; auto mix uses collectPastBayExclusion (any past appearance).
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

function pushPastBayCard(
  cards: PastBayCard[],
  identities: Set<string>,
  item: { title: string; url?: string | null },
  date: string,
  kind: PastBayCard["kind"],
) {
  if (!date || !item.title?.trim()) return;
  addIdentity(identities, item);
  cards.push({
    date,
    kind,
    title: item.title,
    url: item.url ?? null,
  });
}

/**
 * Build the auto-mix exclusion corpus from every stored morning letter and
 * homepage edition older than today. Exact URL / normalized-title identity is
 * permanent for the life of the archive; recentCards drives same-story
 * rewrite matching inside SAME_STORY_LOOKBACK_DAYS.
 */
export function collectPastBayExclusion(
  email_editions: EmailEditionSnapshot[] | null | undefined,
  editions: EditionSnapshot[] | null | undefined,
  at: Date,
  options: { sameStoryLookbackDays?: number } = {},
): PastBayExclusion {
  const today = emailDetroitDateKey(at);
  const lookbackDays = options.sameStoryLookbackDays ?? SAME_STORY_LOOKBACK_DAYS;
  const sameStoryOldest = addDetroitCalendarDays(today, -lookbackDays);
  const identities = new Set<string>();
  const allCards: PastBayCard[] = [];

  for (const letter of email_editions ?? []) {
    if (!letter.date || letter.date >= today) continue;
    if (letter.lead) {
      pushPastBayCard(allCards, identities, letter.lead, letter.date, "letter");
    }
    for (const card of letter.around ?? []) {
      pushPastBayCard(allCards, identities, card, letter.date, "letter");
    }
    // Mailed alerts / tonight / civic / sports heads must not resurface in Around.
    for (const card of letter.alerts ?? []) {
      pushPastBayCard(allCards, identities, card, letter.date, "letter");
    }
    for (const card of letter.tonight ?? []) {
      pushPastBayCard(allCards, identities, card, letter.date, "letter");
    }
    for (const card of letter.civic ?? []) {
      pushPastBayCard(allCards, identities, card, letter.date, "letter");
    }
    for (const card of letter.sports ?? []) {
      pushPastBayCard(allCards, identities, card, letter.date, "letter");
    }
  }

  for (const edition of editions ?? []) {
    if (!edition.date || edition.date >= today) continue;
    if (edition.lead) {
      pushPastBayCard(
        allCards,
        identities,
        edition.lead,
        edition.date,
        "homepage",
      );
    }
    for (const card of edition.around ?? []) {
      pushPastBayCard(
        allCards,
        identities,
        card,
        edition.date,
        "homepage",
      );
    }
  }

  const recentCards = allCards.filter((c) => c.date >= sameStoryOldest);
  return { identities, recentCards, allCards };
}

/**
 * True when this card already ran (URL / normalized title) or is a same-story
 * rewrite of a prior bay/letter card inside the lookback window.
 */
export function wasExcludedByPastBay(
  item: { title: string; url?: string | null },
  corpus: PastBayExclusion,
): boolean {
  if (wasInPriorLetter(item, corpus.identities)) return true;
  if (!item.title?.trim()) return false;
  for (const prior of corpus.recentCards) {
    if (titlesLikelySameStory(item.title, prior.title)) return true;
  }
  return false;
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
    title: sanitizePublicText(cluster.title),
    dek: sanitizePublicText(cluster.dek),
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
 * Pick Around-the-bay cards that did not already run.
 * Prefer a full slate; if fewer than the soft minimum are new, return the
 * short fresh list — never pad with already-run heads. Collapse same-story
 * second-desk rewrites (and Boardman sewage pairs) within the slate and
 * against priorTitles (recent archive rewrites).
 */
export function pickFreshAroundForLetter<
  T extends { title: string; url: string },
>(
  candidates: T[],
  prior: Set<string>,
  max = LETTER_AROUND_MAX,
  priorTitles: string[] = [],
): T[] {
  const out: T[] = [];
  for (const candidate of candidates) {
    if (wasInPriorLetter(candidate, prior)) continue;
    if (priorTitles.some((t) => titlesLikelySameStory(t, candidate.title))) {
      continue;
    }
    if (out.some((picked) => titlesLikelySameStory(picked.title, candidate.title))) {
      continue;
    }
    out.push(candidate);
    if (out.length >= max) break;
  }
  return out;
}

function corpusToPriorBayCards(corpus: PastBayExclusion): PriorBayCards {
  return {
    lead: null,
    around: corpus.recentCards.map((c) => ({
      title: c.title,
      url: c.url,
    })),
  };
}

/**
 * Homepage / dated-edition Around the bay: drop every card that already
 * appeared in ANY past morning letter or homepage edition (URL / normalized
 * title), plus same-story second-outlet rewrites inside
 * SAME_STORY_LOOKBACK_DAYS. A shorter unused mix beats recycling. Staff
 * originals are not passed in (lead is separate). preferHardNews defaults
 * true so unattended pulls put free/RE hard news ahead of soft fillers.
 * Outlet caps (9&10 ≤2, RE ≤2, Eyes Only ≤2) live in selectAroundTheBay.
 */
export function selectFreshAroundTheBay(
  clusters: ClusteredStory[],
  editions: EditionSnapshot[] | null | undefined,
  at: Date,
  options: {
    maxUpNorth?: number;
    preferHardNews?: boolean;
    /** Morning-letter archive — required for cross-surface exclusion. */
    email_editions?: EmailEditionSnapshot[] | null;
  } = {},
): ClusteredStory[] {
  const corpus = collectPastBayExclusion(
    options.email_editions,
    editions,
    at,
  );
  const priorCards = corpusToPriorBayCards(corpus);
  const bayExclude = expandExcludedWithClusterMembers(
    corpus.identities,
    clusters,
    priorCards,
  );
  const priorTitles = corpus.recentCards.map((c) => c.title);

  // Rank unused stories first — do not score a pool dominated by already-run heads.
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
    preferHardNews: options.preferHardNews ?? true,
    now: at,
  });

  return pickFreshAroundForLetter(
    candidates,
    bayExclude,
    BAY_AROUND_MAX,
    priorTitles,
  );
}

/**
 * Assemble the morning letter from the same live mix rules as /email preview.
 *
 * Uniqueness:
 * - Every past morning letter and homepage edition in the archive — never
 *   recycle a card that already ran on either surface (URL / title).
 * - Same-story second-outlet rewrites inside SAME_STORY_LOOKBACK_DAYS stay out.
 * - When a prior identity hits a cluster, every member URL/title is excluded
 *   so a second-desk rewrite cannot follow.
 * - Shorter unused mix beats padding with already-run heads. Hard news first.
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
    /**
     * When set with around_locked, keep Desk’s Around slate instead of
     * auto-picking bay cards. Other sections still rebuild.
     */
    around?: EmailStoryCard[] | null;
    around_locked?: boolean;
  } = {},
): EmailEditionSnapshot {
  const corpus = collectPastBayExclusion(
    data.email_editions,
    data.editions,
    at,
  );
  const clusters = clusterStories(data.stories, data.sources);
  const priorCards = corpusToPriorBayCards(corpus);
  const priorTitles = corpus.recentCards.map((c) => c.title);
  const priorExpanded = expandExcludedWithClusterMembers(
    corpus.identities,
    clusters,
    priorCards,
  );

  const originals = clusters.filter((c) => c.is_original);
  const leadCluster = originals[0] ?? null;

  // Any past letter or homepage appearance blocks everyone — hard news included.
  const unused = clusters.filter((c) => {
    if (c.is_original) return false;
    return !clusterHitsExcluded(c, priorExpanded, priorTitles);
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
  const autoAround = pickFreshAroundForLetter(
    aroundClusters.map(toAroundCard),
    priorExpanded,
    LETTER_AROUND_MAX,
    priorTitles,
  );
  const aroundLocked = Boolean(
    options.around_locked && Array.isArray(options.around),
  );
  const around =
    aroundLocked && Array.isArray(options.around)
      ? options.around.slice(0, LETTER_AROUND_MAX)
      : autoAround;

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
    around_locked: aroundLocked || undefined,
  };
}
