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
    "https://upnorthlive.com",
    "https://leelanaunews.com",
    "https://www.oldmission.net",
    "https://glenarborsun.com",
    "https://www.elkrapidsnews.com",
    "https://www.recordpatriot.com",
    "https://betsiecurrent.com",
    "https://www.antrimreview.net",
    "https://antrimreview.net",
    "https://www.leelanau.gov",
    "https://www.gtbindians.org",
    "https://www.traversecitymi.gov",
    "https://www.traversecitymi.gov/news",
  ].flatMap((u) => [u, `${u}/`]),
);

/** Sports / HS sports source ids — have their own /sports page. */
const SPORTS_SOURCE_IDS = new Set([
  "src_910_sports",
  "src_re_sports",
  "src_re_prep",
  "src_tcc_ath",
  "src_tcw_ath",
  "src_tcsf_ath",
  "src_tcch_ath",
  "src_elk_ath",
  "src_suttons_ath",
  "src_leland_ath",
  "src_glenlake_ath",
  "src_kingsley_ath",
]);

/** Prefer these free desks for Around the bay (not Record-Eagle / UpNorthLive). */
const PREFERRED_NEWS_SOURCE_IDS = new Set([
  "src_ticker",
  "src_ipr",
  "src_tcbn",
  "src_northern",
  "src_910",
  "src_omp_gazette",
  "src_glenarbor_sun",
  "src_leelanau_ent",
  "src_elk_news",
  "src_benzie_rp",
  "src_betsie",
  "src_antrim_review",
]);

/**
 * High-volume free desks that can crowd out IPR / TCBN / Northern / Betsie.
 * Cap separately so a Saturday bay is not Ticker + 9&10 only.
 */
const HEAVY_FREE_WIRE_SOURCE_IDS = new Set(["src_ticker", "src_910"]);

/** Official desks — keep a few on the bay even when older than the wire. */
const OFFICIAL_NEWS_SOURCE_IDS = new Set([
  "src_city_news",
  "src_leelanau_co",
  "src_gtb",
]);

/** Heavy TV wire — cap like Record-Eagle so it does not eat the bay. */
const UPNORTH_SOURCE_IDS = new Set(["src_upnorth"]);

export function isUpNorthSourceId(id: string): boolean {
  return UPNORTH_SOURCE_IDS.has(id);
}

export function isUpNorthCluster(cluster: ClusteredStory): boolean {
  return cluster.sources.some((s) => isUpNorthSourceId(s.id));
}

export function isOfficialNewsSourceId(id: string): boolean {
  return OFFICIAL_NEWS_SOURCE_IDS.has(id);
}

export function isOfficialNewsCluster(cluster: ClusteredStory): boolean {
  return cluster.sources.some((s) => isOfficialNewsSourceId(s.id));
}

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
    const host = new URL(input.url).hostname.toLowerCase();
    if (
      host.includes("traversecitymi.gov") ||
      host.includes("leelanau.gov") ||
      host.includes("gtbindians.org")
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
  if (OFFICIAL_NEWS_SOURCE_IDS.has(sid)) score += 2_500;
  if (sid === "src_910_sports") score += 1_200;
  // Paywalled RE is allowed but not preferred for the free-desk majority.
  if (isRecordEagleCluster(cluster)) score -= 3_000;
  // UpNorthLive is free but heavy — soft-penalize so it does not dominate.
  if (isUpNorthCluster(cluster)) score -= 2_000;
  // Recency (ms since epoch, scaled) as tiebreaker within the same tier.
  score += new Date(cluster.published_at).getTime() / 1e12;
  return score;
}

/** Drop bay copy older than this many Detroit calendar days. */
export const BAY_MAX_AGE_DAYS = 14;

export type AroundSelectOptions = {
  limit?: number;
  /** Soft cap per primary desk. Default 3 of 18. */
  maxPerSource?: number;
  /** Cap for sports/HS sports clusters. Default 4 of 18. */
  maxSports?: number;
  /** Cap for all Record-Eagle sources as one paywall bucket. Default 2. */
  maxRecordEagle?: number;
  /** Cap for UpNorthLive so the TV wire does not eat the bay. Default 3. */
  maxUpNorth?: number;
  /**
   * Cap for high-volume free desks (Ticker + 9&10 News) so smaller preferred
   * desks still get bay slots. Default 2 each.
   */
  maxHeavyWire?: number;
  /** Reserved slots for official city/county/tribal headlines. Default 2. */
  maxOfficial?: number;
  /** Clock for the 14-day max-age window. Defaults to now. */
  now?: Date;
};

function withinBayMaxAge(cluster: ClusteredStory, now: Date): boolean {
  const published = new Date(cluster.published_at).getTime();
  if (!Number.isFinite(published)) return false;
  const maxAgeMs = BAY_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  return published >= now.getTime() - maxAgeMs;
}

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
    maxUpNorth: number;
    maxHeavyWire: number;
    sportsCount: { n: number };
    reCount: { n: number };
    upNorthCount: { n: number };
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

  // Smaller preferred desks first, then Ticker/9&10, then everyone else.
  const preferredKeys = [...queues.keys()]
    .filter((k) => PREFERRED_NEWS_SOURCE_IDS.has(k) || k === "src_910_sports")
    .sort((a, b) => {
      const ha = HEAVY_FREE_WIRE_SOURCE_IDS.has(a) ? 1 : 0;
      const hb = HEAVY_FREE_WIRE_SOURCE_IDS.has(b) ? 1 : 0;
      return ha - hb;
    });
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
      if (
        HEAVY_FREE_WIRE_SOURCE_IDS.has(key) &&
        (counts.get(key) ?? 0) >= options.maxHeavyWire
      ) {
        continue;
      }
      const queue = queues.get(key);
      if (!queue || queue.length === 0) continue;
      while (queue.length > 0) {
        const next = queue.shift()!;
        if (used.has(next.id)) continue;
        const sports = isSportsCluster(next);
        if (sports && options.sportsCount.n >= options.maxSports) continue;
        const re = isRecordEagleCluster(next);
        if (re && options.reCount.n >= options.maxRecordEagle) continue;
        const up = isUpNorthCluster(next);
        if (up && options.upNorthCount.n >= options.maxUpNorth) continue;
        used.add(next.id);
        counts.set(key, (counts.get(key) ?? 0) + 1);
        if (sports) options.sportsCount.n += 1;
        if (re) options.reCount.n += 1;
        if (up) options.upNorthCount.n += 1;
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
 * Ticker + 9&10 News are capped so smaller preferred desks (IPR, TCBN,
 * Northern, Betsie, …) still get slots. UpNorthLive and Record-Eagle stay
 * capped. Official city/county/tribal headlines get a few reserved slots.
 */
export function selectAroundTheBay(
  clusters: ClusteredStory[],
  options: AroundSelectOptions = {},
): ClusteredStory[] {
  const limit = options.limit ?? 18;
  const maxPerSource = options.maxPerSource ?? 3;
  const maxSports = options.maxSports ?? 4;
  const maxRecordEagle = options.maxRecordEagle ?? 2;
  const maxUpNorth = options.maxUpNorth ?? 3;
  const maxHeavyWire = options.maxHeavyWire ?? 2;
  const maxOfficial = options.maxOfficial ?? 2;
  const now = options.now ?? new Date();

  const eligible = clusters
    .filter((c) => !c.is_original)
    .filter((c) => !c.sources.some((s) => isAlertSourceId(s.id)))
    .filter((c) => !isOutletHomepageUrl(c.url))
    .filter((c) => !isLifestyleJunk(c))
    .filter((c) => !looksLikeCivicListing(c))
    .filter((c) => withinBayMaxAge(c, now))
    .sort((a, b) => {
      const diff = clusterScore(b) - clusterScore(a);
      if (diff !== 0) return diff;
      return (
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
      );
    });

  const sports = eligible.filter(isSportsCluster);
  const upNorthNews = eligible.filter(
    (c) => !isSportsCluster(c) && isUpNorthCluster(c),
  );
  const freeNews = eligible.filter(
    (c) =>
      !isSportsCluster(c) &&
      !isRecordEagleCluster(c) &&
      !isUpNorthCluster(c),
  );
  const reNews = eligible.filter(
    (c) => !isSportsCluster(c) && isRecordEagleCluster(c),
  );
  const officialNews = freeNews.filter(isOfficialNewsCluster);

  const picked: ClusteredStory[] = [];
  const counts = new Map<string, number>();
  const used = new Set<string>();
  const sportsCount = { n: 0 };
  const reCount = { n: 0 };
  const upNorthCount = { n: 0 };

  const underHeavy = (key: string) =>
    !HEAVY_FREE_WIRE_SOURCE_IDS.has(key) ||
    (counts.get(key) ?? 0) < maxHeavyWire;

  // Majority free desks: leave room for sports + RE + UpNorth + official.
  const freeTarget = Math.max(
    0,
    limit -
      Math.min(maxSports, sports.length) -
      maxRecordEagle -
      maxUpNorth,
  );

  // 0) Reserve a few official city/county/tribal headlines (may be older).
  for (const c of officialNews) {
    if (picked.length >= maxOfficial) break;
    if (used.has(c.id)) continue;
    const key = primarySourceKey(c);
    if ((counts.get(key) ?? 0) >= maxPerSource) continue;
    if (!underHeavy(key)) continue;
    used.add(c.id);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    picked.push(c);
  }

  // 1) Multi-source free-news clusters first.
  for (const c of freeNews) {
    if (picked.length >= freeTarget) break;
    if (c.sources.length < 2) continue;
    if (used.has(c.id)) continue;
    const key = primarySourceKey(c);
    if ((counts.get(key) ?? 0) >= maxPerSource) continue;
    if (!underHeavy(key)) continue;
    used.add(c.id);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    picked.push(c);
  }

  const poolOpts = {
    maxPerSource,
    maxSports,
    maxRecordEagle,
    maxUpNorth,
    maxHeavyWire,
    sportsCount,
    reCount,
    upNorthCount,
  };

  // 2) Preferred free desks (smaller desks before Ticker/9&10), then others.
  takeFromPool(freeNews, picked, used, counts, {
    ...poolOpts,
    limit: freeTarget,
  });

  // 3) Up to maxSports sports (RE sports count toward both caps).
  takeFromPool(sports, picked, used, counts, { ...poolOpts, limit });

  // 4) Up to maxRecordEagle RE news.
  takeFromPool(reNews, picked, used, counts, { ...poolOpts, limit });

  // 5) Up to maxUpNorth TV wire.
  takeFromPool(upNorthNews, picked, used, counts, { ...poolOpts, limit });

  // 6) Soft fill under caps — still respect heavy-wire limits.
  if (picked.length < limit) {
    for (const c of [...freeNews, ...sports, ...reNews, ...upNorthNews]) {
      if (picked.length >= limit) break;
      if (used.has(c.id)) continue;
      const key = primarySourceKey(c);
      if ((counts.get(key) ?? 0) >= maxPerSource + 1) continue;
      if (
        HEAVY_FREE_WIRE_SOURCE_IDS.has(key) &&
        (counts.get(key) ?? 0) >= maxHeavyWire
      ) {
        continue;
      }
      const sportsItem = isSportsCluster(c);
      if (sportsItem && sportsCount.n >= maxSports) continue;
      const reItem = isRecordEagleCluster(c);
      if (reItem && reCount.n >= maxRecordEagle) continue;
      const upItem = isUpNorthCluster(c);
      if (upItem && upNorthCount.n >= maxUpNorth) continue;
      used.add(c.id);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      if (sportsItem) sportsCount.n += 1;
      if (reItem) reCount.n += 1;
      if (upItem) upNorthCount.n += 1;
      picked.push(c);
    }
  }

  return picked;
}
