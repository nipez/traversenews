import type { ClusteredStory } from "@/lib/types";
import { isAlertSourceId } from "@/lib/alerts";
import { isRecordEagleCluster } from "@/lib/paywall";

const JUNK_TITLE_MARKERS = [
  "blood drive",
  "bestselling books",
  "best-selling books",
  "years ago",
  "on language",
  "community in brief",
  "life as i know it",
  "horoscope",
  "horoscopes",
  "stacker",
  "sudoku",
  "crossword",
  "lottery",
  "comics",
  "dear abbey",
  "dear abby",
  "bridge column",
  "celebrity cipher",
  "tv listings",
  "movie times",
];

const JUNK_PATH_MARKERS = [
  "/lifestyles/",
  "/body_and_soul/",
  "/northern_living/",
  "/opinion/columnists/",
  "/entertainment/horoscope",
];

/** Civic calendar / board listings that must not appear in Around the bay. */
const CIVIC_STORY_MARKERS = [
  "economic development corporation",
  "planning commission",
  "zoning board",
  "school board",
  "board of commissioners",
  "city commission",
  "township board",
  "county board",
  "board study session",
  "board curriculum",
  "board finance",
  "board executive",
  "community connection event",
];

function looksLikeCivicListing(input: {
  title: string;
  dek?: string;
  url: string;
}): boolean {
  const blob = `${input.title} ${input.dek ?? ""}`.toLowerCase();
  if (CIVIC_STORY_MARKERS.some((m) => blob.includes(m))) return true;
  try {
    const u = new URL(input.url);
    const host = u.hostname.toLowerCase();
    const path = `${u.pathname}${u.search}`.toLowerCase();
    if (host.includes("gtcountymi.gov") && path.includes("calendar")) return true;
    if (path.includes("civicweb") || path.includes("/meetings/")) return true;
    if (/eid=\d+/i.test(u.search)) return true;
  } catch {
    // ignore
  }
  return false;
}

const LOCAL_PLACE_MARKERS = [
  "traverse city",
  "grand traverse",
  "leelanau",
  "antrim",
  "benzonia",
  "suttons bay",
  "elk rapids",
  "kingsley",
  "interlochen",
  "acme",
  "garfield township",
  "east bay",
  "old mission",
  "northport",
  "leland",
  "frankfort",
  "cadillac",
  "petoskey",
  "charlevoix",
];

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/$/, "");
}

const OUTLET_HOMEPAGES = new Set(
  [
    "https://www.9and10news.com",
    "https://www.traverseticker.com",
    "https://www.record-eagle.com",
    "https://www.interlochenpublicradio.org",
    "https://www.northernexpress.com",
  ].flatMap((u) => [u, `${u}/`]),
);

/** Sports / HS sports source ids — have their own /sports page. */
const SPORTS_SOURCE_IDS = new Set([
  "src_910_sports",
  "src_re_sports",
  "src_re_prep",
  "src_tcc_ath",
  "src_tcw_ath",
]);

/** Prefer these free desks for Around the bay (not Record-Eagle). */
const PREFERRED_NEWS_SOURCE_IDS = new Set([
  "src_ticker",
  "src_ipr",
  "src_tcbn",
  "src_northern",
  "src_910",
]);

/** Columns, briefs, calendars, books, wire fillers — not homepage news. */
export function isLifestyleJunk(input: {
  title: string;
  dek?: string;
  url: string;
}): boolean {
  const blob = `${input.title} ${input.dek ?? ""}`.toLowerCase();
  if (JUNK_TITLE_MARKERS.some((m) => blob.includes(m))) return true;
  if (/\bcalendar\s*:/i.test(input.title)) return true;
  if (/\bnews from\s+\d+\s+years?\s+ago\b/i.test(input.title)) return true;
  if (/^\s*brief(s)?\b/i.test(input.title.trim())) return true;

  try {
    const path = new URL(input.url).pathname.toLowerCase();
    if (JUNK_PATH_MARKERS.some((m) => path.includes(m))) return true;
  } catch {
    // ignore bad urls — homepage check handles empties
  }
  return false;
}

export function isOutletHomepageUrl(url: string): boolean {
  const u = normalizeUrl(url);
  return OUTLET_HOMEPAGES.has(u) || OUTLET_HOMEPAGES.has(`${u}/`);
}

export function looksLikeLocalNews(input: {
  title: string;
  dek?: string;
  url: string;
}): boolean {
  const blob = `${input.title} ${input.dek ?? ""}`.toLowerCase();
  if (LOCAL_PLACE_MARKERS.some((m) => blob.includes(m))) return true;
  try {
    const path = new URL(input.url).pathname.toLowerCase();
    if (
      path.includes("/local_news/") ||
      path.includes("/local/") ||
      path.includes("/news/local") ||
      path.includes("/gt/") ||
      path.includes("/traverse")
    ) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

function primarySourceKey(cluster: ClusteredStory): string {
  return cluster.sources[0]?.id || cluster.sources[0]?.name || "unknown";
}

export function isSportsCluster(cluster: ClusteredStory): boolean {
  return cluster.sources.some((s) => {
    if (SPORTS_SOURCE_IDS.has(s.id)) return true;
    const name = s.name.toLowerCase();
    return (
      name.includes("sports") ||
      name.includes("athletics") ||
      name.includes("local sports")
    );
  });
}

function clusterScore(cluster: ClusteredStory): number {
  let score = 0;
  if (cluster.sources.length > 1) score += 10_000;
  if (looksLikeLocalNews(cluster)) score += 2_000;
  const sid = primarySourceKey(cluster);
  if (PREFERRED_NEWS_SOURCE_IDS.has(sid)) score += 1_500;
  if (sid === "src_910_sports") score += 1_200;
  // Paywalled RE is allowed but not preferred for the free-desk majority.
  if (isRecordEagleCluster(cluster)) score -= 3_000;
  // Recency (ms since epoch, scaled) as tiebreaker within the same tier.
  score += new Date(cluster.published_at).getTime() / 1e12;
  return score;
}

export type AroundSelectOptions = {
  limit?: number;
  /** Soft cap per primary desk. Default 4 of 18. */
  maxPerSource?: number;
  /** Cap for sports/HS sports clusters. Default 4 of 18. */
  maxSports?: number;
  /** Cap for all Record-Eagle sources as one paywall bucket. Default 3. */
  maxRecordEagle?: number;
};

function takeFromPool(
  pool: ClusteredStory[],
  picked: ClusteredStory[],
  used: Set<string>,
  counts: Map<string, number>,
  options: {
    limit: number;
    maxPerSource: number;
    maxSports: number;
    maxRecordEagle: number;
    sportsCount: { n: number };
    reCount: { n: number };
  },
) {
  const queues = new Map<string, ClusteredStory[]>();
  for (const c of pool) {
    if (used.has(c.id)) continue;
    const key = primarySourceKey(c);
    const q = queues.get(key) ?? [];
    q.push(c);
    queues.set(key, q);
  }

  // Preferred free desks / 9&10 sports first in round-robin order.
  const preferredKeys = [...queues.keys()].filter(
    (k) => PREFERRED_NEWS_SOURCE_IDS.has(k) || k === "src_910_sports",
  );
  const otherKeys = [...queues.keys()].filter(
    (k) => !PREFERRED_NEWS_SOURCE_IDS.has(k) && k !== "src_910_sports",
  );
  const keyOrder = [...preferredKeys, ...otherKeys];

  let progress = true;
  while (picked.length < options.limit && progress) {
    progress = false;
    for (const key of keyOrder) {
      if (picked.length >= options.limit) break;
      if ((counts.get(key) ?? 0) >= options.maxPerSource) continue;
      const queue = queues.get(key);
      if (!queue || queue.length === 0) continue;
      while (queue.length > 0) {
        const next = queue.shift()!;
        if (used.has(next.id)) continue;
        const sports = isSportsCluster(next);
        if (sports && options.sportsCount.n >= options.maxSports) continue;
        const re = isRecordEagleCluster(next);
        if (re && options.reCount.n >= options.maxRecordEagle) continue;
        used.add(next.id);
        counts.set(key, (counts.get(key) ?? 0) + 1);
        if (sports) options.sportsCount.n += 1;
        if (re) options.reCount.n += 1;
        picked.push(next);
        progress = true;
        break;
      }
    }
  }
}

/**
 * Homepage / edition Around the bay mix:
 * drop lifestyle junk, require real permalinks, prefer multi-source local,
 * interleave desks so one outlet cannot fill the rail.
 * Sports/HS is capped — full sports list lives on /sports.
 */
export function selectAroundTheBay(
  clusters: ClusteredStory[],
  options: AroundSelectOptions = {},
): ClusteredStory[] {
  const limit = options.limit ?? 18;
  const maxPerSource = options.maxPerSource ?? 4;
  const maxSports = options.maxSports ?? 4;
  const maxRecordEagle = options.maxRecordEagle ?? 3;

  const eligible = clusters
    .filter((c) => !c.is_original)
    .filter((c) => !c.sources.some((s) => isAlertSourceId(s.id)))
    .filter((c) => !isOutletHomepageUrl(c.url))
    .filter((c) => !isLifestyleJunk(c))
    .filter((c) => !looksLikeCivicListing(c))
    .sort((a, b) => {
      const diff = clusterScore(b) - clusterScore(a);
      if (diff !== 0) return diff;
      return (
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
      );
    });

  const sports = eligible.filter(isSportsCluster);
  const freeNews = eligible.filter(
    (c) => !isSportsCluster(c) && !isRecordEagleCluster(c),
  );
  const reNews = eligible.filter(
    (c) => !isSportsCluster(c) && isRecordEagleCluster(c),
  );

  const picked: ClusteredStory[] = [];
  const counts = new Map<string, number>();
  const used = new Set<string>();
  const sportsCount = { n: 0 };
  const reCount = { n: 0 };

  // Majority free desks: leave room for sports + RE caps (RE is one bucket).
  const freeTarget = Math.max(
    0,
    limit - Math.min(maxSports, sports.length) - maxRecordEagle,
  );

  // 1) Multi-source free-news clusters first.
  for (const c of freeNews) {
    if (picked.length >= freeTarget) break;
    if (c.sources.length < 2) continue;
    const key = primarySourceKey(c);
    if ((counts.get(key) ?? 0) >= maxPerSource) continue;
    used.add(c.id);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    picked.push(c);
  }

  // 2) Preferred free desks, then other free non-sports.
  takeFromPool(freeNews, picked, used, counts, {
    limit: freeTarget,
    maxPerSource,
    maxSports,
    maxRecordEagle,
    sportsCount,
    reCount,
  });

  // 3) Up to maxSports sports (RE sports count toward both caps).
  takeFromPool(sports, picked, used, counts, {
    limit,
    maxPerSource,
    maxSports,
    maxRecordEagle,
    sportsCount,
    reCount,
  });

  // 4) Up to maxRecordEagle RE news (if sports did not already fill the bucket).
  takeFromPool(reNews, picked, used, counts, {
    limit,
    maxPerSource,
    maxSports,
    maxRecordEagle,
    sportsCount,
    reCount,
  });

  // 5) Soft fill: free first, then sports/RE under caps.
  if (picked.length < limit) {
    for (const c of [...freeNews, ...sports, ...reNews]) {
      if (picked.length >= limit) break;
      if (used.has(c.id)) continue;
      const key = primarySourceKey(c);
      if ((counts.get(key) ?? 0) >= maxPerSource + 1) continue;
      const sportsItem = isSportsCluster(c);
      if (sportsItem && sportsCount.n >= maxSports) continue;
      const reItem = isRecordEagleCluster(c);
      if (reItem && reCount.n >= maxRecordEagle) continue;
      used.add(c.id);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      if (sportsItem) sportsCount.n += 1;
      if (reItem) reCount.n += 1;
      picked.push(c);
    }
  }

  return picked;
}
