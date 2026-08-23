import { selectAlerts } from "@/lib/alerts";
import { selectAroundTheBay } from "@/lib/around";
import {
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
import { selectUpcomingSchoolDays } from "@/lib/schools";
import type {
  AppData,
  AthleticsGame,
  EmailAlertCard,
  EmailEditionSnapshot,
  EmailEventCard,
  EmailSchoolsCard,
  EmailSportsCard,
  EmailStoryCard,
  EventItem,
  SchoolCalendarItem,
  Source,
} from "@/lib/types";

const DETROIT = "America/Detroit";

/** Soft ceiling so the letter archive cannot balloon KV. */
export const MAX_EMAIL_EDITIONS = 90;

/**
 * Inclusive Detroit calendar days in the Civic/Sports letter window
 * (edition morning + 6 more = 7 days).
 */
export const LETTER_WEEK_DAYS = 7;

/**
 * PRODUCT RULE (Nick, locked): Civic and Sports in the morning letter are
 * UNIQUE EACH MORNING — not a frozen weekly highlight reel.
 *
 * Window = the next {@link LETTER_WEEK_DAYS} America/Detroit calendar days
 * starting on the edition date (the morning it sends / is snapshotted).
 * Tuesday’s letter must not keep Monday-only items once Monday has passed.
 * Still spread across remaining days; still prefer boards/cancellations and
 * varsity. If only one remaining day, rename the section head to that day.
 * What’s on stays tonight/upcoming the same way. Never invent times.
 */

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

/** Detroit weekday 0=Sun … 6=Sat. */
export function emailDetroitWeekday(at = new Date()): number {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: DETROIT,
    weekday: "short",
  }).format(at);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[wd] ?? at.getUTCDay();
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

function hasRealDek(dek: string): boolean {
  return dek.replace(/\s+/g, " ").trim().length >= 20;
}

/**
 * Around the bay: prefer clusters with real pulled text, then fill to 5–6.
 * Never invents copy — thin city briefs still ship with title-only cards.
 */
function pickAroundForLetter<T extends { dek: string }>(clusters: T[]): T[] {
  const withText = clusters.filter((c) => hasRealDek(c.dek));
  const thin = clusters.filter((c) => !hasRealDek(c.dek));
  if (withText.length >= 5) return withText.slice(0, 6);
  const picked = [...withText];
  for (const c of thin) {
    if (picked.length >= 5) break;
    picked.push(c);
  }
  if (picked.length === 0) return clusters.slice(0, 6);
  return picked.slice(0, 6);
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

function toSportsCard(g: AthleticsGame): EmailSportsCard {
  const card: EmailSportsCard = {
    title: g.title,
    starts_at: g.starts_at,
    place: g.place,
    url: g.url,
    school: g.school,
  };
  if (g.time_unknown) card.time_unknown = true;
  return card;
}

/**
 * Next upcoming official Important date across districts already in schools data.
 * One beat only — never the full calendar.
 */
export function pickNextSchoolBeat(
  items: SchoolCalendarItem[],
  at = new Date(),
): EmailSchoolsCard | null {
  const next = selectUpcomingSchoolDays(items, at)[0];
  if (!next) return null;
  const card: EmailSchoolsCard = {
    title: next.title,
    starts_at: next.starts_at,
    district: next.district,
    url: next.url,
  };
  if (next.time_unknown) card.time_unknown = true;
  return card;
}

/**
 * Add Detroit calendar days to a YYYY-MM-DD key (noon Detroit anchor — not noon
 * as a showtime; only a DST-safe day step).
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

/**
 * Edition-morning window for Civic/Sports: start = edition Detroit date,
 * end = start + (LETTER_WEEK_DAYS - 1). Recomputed every morning — past days
 * drop out. Not a frozen weekly reel.
 */
export function letterWeekRange(editionAt = new Date()): {
  startKey: string;
  endKey: string;
} {
  const startKey = emailDetroitDateKey(editionAt);
  const endKey = addDetroitCalendarDays(startKey, LETTER_WEEK_DAYS - 1);
  return { startKey, endKey };
}

/** True when starts_at’s Detroit day is in this edition morning’s week window. */
export function inLetterWeek(startsAt: string, editionAt = new Date()): boolean {
  const { startKey, endKey } = letterWeekRange(editionAt);
  const key = detroitDayKey(startsAt);
  return key >= startKey && key <= endKey;
}

/**
 * Pick up to `limit` items spread across different Detroit calendar days.
 * Pass 1: best item per day (chronological days). Pass 2: fill leftovers
 * round-robin. Display order is chronological. Never invents rows.
 */
export function pickAcrossDays<T>(opts: {
  items: T[];
  dayKey: (item: T) => string;
  rank: (item: T) => number;
  startsAt: (item: T) => string;
  limit: number;
}): T[] {
  const { items, dayKey, rank, startsAt, limit } = opts;
  if (items.length === 0 || limit <= 0) return [];

  const byDay = new Map<string, T[]>();
  for (const item of items) {
    const key = dayKey(item);
    const list = byDay.get(key) ?? [];
    list.push(item);
    byDay.set(key, list);
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => {
      const rd = rank(b) - rank(a);
      if (rd !== 0) return rd;
      return (
        new Date(startsAt(a)).getTime() - new Date(startsAt(b)).getTime()
      );
    });
  }

  const days = [...byDay.keys()].sort((a, b) => a.localeCompare(b));
  const queues = new Map(days.map((d) => [d, [...(byDay.get(d) ?? [])]]));
  const picked: T[] = [];

  for (const day of days) {
    if (picked.length >= limit) break;
    const next = queues.get(day)?.shift();
    if (next) picked.push(next);
  }

  let guard = 0;
  while (picked.length < limit && guard < limit * days.length + 2) {
    guard += 1;
    let added = false;
    for (const day of days) {
      if (picked.length >= limit) break;
      const next = queues.get(day)?.shift();
      if (next) {
        picked.push(next);
        added = true;
      }
    }
    if (!added) break;
  }

  return picked.sort(
    (a, b) =>
      new Date(startsAt(a)).getTime() - new Date(startsAt(b)).getTime(),
  );
}

/** Prefer cancellations and board/commission over stacked Tuesday committees. */
export function civicLetterRank(title: string): number {
  const t = title.toLowerCase();
  let s = 0;
  if (/\bcancell/.test(t)) s += 1200;
  const isCommittee =
    /\b(committee|ad hoc|subcommittee|working group)\b/.test(t);
  if (
    !isCommittee &&
    /\b(city commission|county commission|school board|township board|village council|planning commission|zoning board)\b/.test(
      t,
    )
  ) {
    s += 600;
  }
  if (!isCommittee && /\b(board|commission|council|authority)\b/.test(t)) {
    s += 250;
  }
  if (/\b(study session|work session)\b/.test(t)) s += 120;
  if (isCommittee) s -= 40;
  if (/\b(retiree|act\s*345)\b/.test(t)) s -= 60;
  return s;
}

/** Prefer varsity over JV/freshman; soft nudge football/soccer over tennis stacks. */
export function sportsLetterRank(title: string): number {
  const t = title.toLowerCase();
  let s = 0;
  if (isVarsityGameTitle(title)) s += 500;
  if (/\b(jv|j\.v\.|junior varsity|frosh|freshman|freshmen)\b/.test(t)) {
    s -= 300;
  }
  if (/\bfootball\b/.test(t)) s += 90;
  if (/\b(soccer|volleyball|basketball|baseball|softball)\b/.test(t)) s += 40;
  if (/\btennis\b/.test(t)) s += 10;
  return s;
}

/**
 * Civic for this edition morning: up to 4 meetings across remaining days in
 * the edition’s 7-day Detroit window. Past calendar days are excluded.
 * Prefer cancelled + board/commission. Never invents times.
 */
export function pickCivicForLetter(
  events: EventItem[],
  sources: Source[],
  editionAt = new Date(),
  limit = 4,
): EmailEventCard[] {
  const week = dedupeEvents(events)
    .filter((e) => isCivicEvent(e, sources))
    // Hard floor/ceiling on edition Detroit date — not a frozen Mon–Sun reel.
    .filter((e) => inLetterWeek(e.starts_at, editionAt))
    // Drop meetings already past on the edition morning (same-day clock).
    .filter((e) => eventInUpcomingWindow(e, editionAt));

  return pickAcrossDays({
    items: week,
    dayKey: (e) => detroitDayKey(e.starts_at),
    rank: (e) => civicLetterRank(e.title),
    startsAt: (e) => e.starts_at,
    limit,
  }).map(toEventCard);
}

/**
 * Sports for this edition morning: up to 4 games across remaining days in
 * the edition’s 7-day Detroit window. Prefer varsity. Past days drop out.
 * Never invents kickoffs.
 */
export function pickSportsForLetter(
  games: AthleticsGame[],
  editionAt = new Date(),
  limit = 4,
): EmailSportsCard[] {
  // Start from the public This-week slate, then clamp to this edition’s window
  // so Tuesday cannot keep Monday games.
  const week = selectThisWeekAthletics(games, editionAt).filter((g) =>
    inLetterWeek(g.starts_at, editionAt),
  );
  const varsity = week.filter((g) => isVarsityGameTitle(g.title));
  const pool = varsity.length >= 2 ? varsity : week;

  return pickAcrossDays({
    items: pool,
    dayKey: (g) => detroitDayKey(g.starts_at),
    rank: (g) => sportsLetterRank(g.title),
    startsAt: (g) => g.starts_at,
    limit,
  }).map(toSportsCard);
}

/**
 * Section head: "Civic this week" / "Sports this week", or the single
 * Detroit weekday name when every remaining row falls on one calendar day.
 */
export function letterWeekSectionLabel(
  kind: "civic" | "sports",
  startsAts: string[],
): string {
  const base = kind === "civic" ? "Civic" : "Sports";
  const keys = [
    ...new Set(
      startsAts
        .map((s) => detroitDayKey(s))
        .filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k)),
    ),
  ];
  if (keys.length === 1 && startsAts[0]) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: DETROIT,
      weekday: "long",
    }).format(new Date(startsAts[0]));
  }
  return `${base} this week`;
}

/**
 * Assemble the morning letter from the same live mix rules as /email preview.
 * Never invents stories, kickoffs, meetings, or school dates.
 *
 * Civic/Sports are recomputed for `at`’s Detroit morning (unique each day).
 *
 * Weekend (America/Detroit):
 * - Saturday leans What’s on (more nights out).
 * - Sunday is lighter: alerts, what’s on, civic, schools; Around the bay
 *   only when there are real headlines; sports omitted.
 */
export function buildEmailEditionSnapshot(
  data: AppData,
  at = new Date(),
): EmailEditionSnapshot {
  const weekday = emailDetroitWeekday(at);
  const isSaturday = weekday === 6;
  const isSunday = weekday === 0;

  const clusters = clusterStories(data.stories, data.sources);
  const originals = clusters.filter((c) => c.is_original);
  const leadCluster = originals[0] ?? null;

  const aroundClusters = selectAroundTheBay(
    clusters.filter((c) => !c.is_original),
    { limit: 18, maxPerSource: 4, maxSports: 4, maxRecordEagle: 3 },
  );
  let around = pickAroundForLetter(aroundClusters).map(toAroundCard);
  // Sunday: still include Around the bay only when there are real headlines.
  if (isSunday) {
    const withText = around.filter((c) => hasRealDek(c.dek));
    around = withText.length > 0 ? around : [];
  }

  const alerts: EmailAlertCard[] = selectAlerts(data.stories, data.sources, {
    limit: 2,
  }).map((a) => ({
    title: a.title,
    dek: a.dek,
    url: a.url,
    source_name: a.source_name,
  }));

  // What’s on: tonight/upcoming from `at` — same rolling idea, not a weekly reel.
  const tonightLimit = isSaturday ? 5 : 3;
  const tonight = selectTonightEvents(data.events, data.sources, {
    now: at,
    limit: tonightLimit,
    horizonDays: 12,
    maxPerSource: 2,
    timedOnly: true,
  }).map(toEventCard);

  // Civic/Sports: unique for this edition morning’s 7-day Detroit window.
  const civic = pickCivicForLetter(data.events, data.sources, at, 4);
  const sports = isSunday
    ? []
    : pickSportsForLetter(data.athletics ?? [], at, 4);

  const schools = pickNextSchoolBeat(data.schools ?? [], at);

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
    schools,
  };
}
