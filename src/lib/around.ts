import type { ClusteredStory } from "@/lib/types";
import { isAlertSourceId } from "@/lib/alerts";
import { isRecordEagleCluster } from "@/lib/paywall";
import { getSiteId } from "@/lib/sites";

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
  // Soft features that crowd out unused hard news on Saturday letters.
  "library news",
  "dog days of summer",
  "ski hall of fame",
  "ready, set, locals",
  "ready set locals",
  "old neighborhood on the north shore",
  "glen eyrie",
  "going strong for a century",
  "supervisor's weekly note",
  "supervisors weekly note",
  "weekly note:",
];

const JUNK_PATH_MARKERS = [
  "/lifestyles/",
  "/body_and_soul/",
  "/northern_living/",
  "/opinion/columnists/",
  "/entertainment/horoscope",
];

/** Court, housing, bans, aid deadlines — prefer over lifestyle features. */
const HARD_NEWS_TITLE_MARKERS = [
  "data center",
  "data-center",
  "cryptocurrency",
  "moratorium",
  "ban on",
  "under oath",
  "treasurer",
  "housing",
  "affordable",
  "can't afford",
  "cant afford",
  "fema",
  "flood",
  "flooding",
  "lawsuit",
  "arrest",
  "charges",
  "sentenc",
  "zoning",
  "ordinance",
  "budget",
  "crash",
  "killed",
  "fatal",
  "parking rates",
  "parking rate",
  "survey",
];

/** Civic calendar / board listings that must not appear in Around the bay. */
const CIVIC_STORY_MARKERS = [
  "economic development corporation",
  "planning commission",
  "zoning board",
  "school board meeting",
  "board of commissioners meeting",
  "city commission meeting",
  "township board meeting",
  "county board meeting",
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
  // Hard news about a board (under oath, bans, budgets) is not a calendar listing.
  if (looksLikeHardNews(input)) return false;

  const blob = `${input.title} ${input.dek ?? ""}`.toLowerCase();
  if (CIVIC_STORY_MARKERS.some((m) => blob.includes(m))) return true;
  // Bare "school board" / "county board" only when it reads like a meeting notice.
  if (
    /\b(school board|county board|city commission|township board|board of commissioners)\b/i.test(
      blob,
    ) &&
    /\b(agenda|meets|meeting|session|packets?)\b/i.test(blob)
  ) {
    return true;
  }
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
  "src_michigandaily",
  "src_michigandaily_news",
  "src_aaobserver",
  "src_wemu",
  "src_suntimes",
  "src_concentrate",
]);

/**
 * High-volume free TV wire. Cap separately so 9&10 does not eat the bay.
 * Ticker is capped with Eyes Only Media (below), not here.
 */
const HEAVY_FREE_WIRE_SOURCE_IDS = new Set([
  "src_910",
  "src_michigan_public",
]);

/**
 * Eyes Only Media family — The Ticker, Northern Express, TC Business News.
 * One owner; hard-cap the family like Record-Eagle so a Monday letter is not
 * majority Ticker + Northern Express.
 */
export const EYES_ONLY_SOURCE_IDS = new Set([
  "src_ticker",
  "src_northern",
  "src_tcbn",
]);

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

export function isEyesOnlySourceId(id: string): boolean {
  return EYES_ONLY_SOURCE_IDS.has(id);
}

export function isEyesOnlyCluster(cluster: ClusteredStory): boolean {
  return cluster.sources.some((s) => isEyesOnlySourceId(s.id));
}

export function isOfficialNewsSourceId(id: string): boolean {
  return OFFICIAL_NEWS_SOURCE_IDS.has(id);
}

export function isOfficialNewsCluster(cluster: ClusteredStory): boolean {
  return cluster.sources.some((s) => isOfficialNewsSourceId(s.id));
}

/** Columns, briefs, calendars, books, wire fillers — not homepage news. */
/**
 * U-M varsity recaps — not Ann Arbor / Dexter town news.
 * Keep "Michigan Democrats" / legislature; drop SportsMonday and Daily /sports/.
 */
export function looksLikeUmVarsity(input: {
  title: string;
  dek?: string;
  url: string;
}): boolean {
  const blob = `${input.title} ${input.dek ?? ""}`.toLowerCase();
  try {
    const u = new URL(input.url);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    const path = u.pathname.toLowerCase();
    if (host.includes("michigandaily.com") && path.includes("/sports/")) {
      return true;
    }
  } catch {
    // ignore bad urls
  }
  if (/\bsports\s*monday\b/i.test(blob)) return true;
  if (
    /\b(u-?m|university of michigan|wolverines?)\b/i.test(blob) &&
    /\b(football|basketball|hockey|baseball|softball|soccer|volleyball|ncaa|big ten|big-ten)\b/i.test(
      blob,
    )
  ) {
    return true;
  }
  if (
    /\bmichigan\b/i.test(blob) &&
    /\b(football|wolverines?)\b/i.test(blob) &&
    !/\b(democrat|republican|legislat|house|senate|governor|primary|election)\b/i.test(
      blob,
    )
  ) {
    return true;
  }
  return false;
}

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
  if (/^\s*library news\s*:/i.test(input.title.trim())) return true;

  try {
    const path = new URL(input.url).pathname.toLowerCase();
    if (JUNK_PATH_MARKERS.some((m) => path.includes(m))) return true;
    // Northern Express feature rail is usually lifestyle, not hard news.
    if (path.includes("/news/feature/")) return true;
  } catch {
    // ignore bad urls — homepage check handles empties
  }
  return false;
}

/**
 * Court, housing, bans, flood aid, under-oath reports — letter/bay should
 * prefer these over soft desk fillers when both are unused.
 */
export function looksLikeHardNews(input: {
  title: string;
  dek?: string;
  url?: string;
}): boolean {
  const blob = `${input.title} ${input.dek ?? ""}`.toLowerCase();
  if (HARD_NEWS_TITLE_MARKERS.some((m) => blob.includes(m))) return true;
  if (/\b(ban|lawsuit|ordinance|moratorium)\b/i.test(input.title)) return true;
  try {
    if (input.url) {
      const path = new URL(input.url).pathname.toLowerCase();
      if (path.includes("/local_news/") || path.includes("/ipr-news/")) {
        // Local news path alone is not enough; keep marker check primary.
      }
    }
  } catch {
    // ignore
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
  if (looksLikeHardNews(cluster)) score += 4_000;
  const sid = primarySourceKey(cluster);
  if (PREFERRED_NEWS_SOURCE_IDS.has(sid)) score += 1_500;
  if (OFFICIAL_NEWS_SOURCE_IDS.has(sid)) score += 2_500;
  if (sid === "src_910_sports") score += 1_200;
  // Paywalled RE is allowed but not preferred for the free-desk majority.
  if (isRecordEagleCluster(cluster)) score -= 3_000;
  // UpNorthLive is free but heavy — soft-penalize so it does not dominate.
  if (isUpNorthCluster(cluster)) score -= 2_000;
  // Eyes Only family (Ticker / NE / TCBN) — cancel preferred boost so IPR /
  // 9&10 / Glen Arbor / government win unused slots over freshness alone.
  if (isEyesOnlyCluster(cluster)) score -= 2_000;
  // Heavy free TV wire (9&10) — soft-penalize vs smaller preferred desks.
  if (HEAVY_FREE_WIRE_SOURCE_IDS.has(sid)) score -= 800;
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
   * Cap for high-volume free TV (9&10 News) so smaller preferred desks still
   * get bay slots. Default 2.
   */
  maxHeavyWire?: number;
  /**
   * Cap for Eyes Only Media (Ticker + Northern Express + TCBN) as one owner
   * family. Default 2 — same hard ceiling as Record-Eagle.
   */
  maxEyesOnly?: number;
  /** Reserved slots for official city/county/tribal headlines. Default 2. */
  maxOfficial?: number;
  /**
   * Morning letter: take hard news (free + RE) before soft desk fillers so
   * unused IPR / RE stories are not buried under lifestyle round-robin.
   */
  preferHardNews?: boolean;
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
    maxEyesOnly: number;
    sportsCount: { n: number };
    reCount: { n: number };
    upNorthCount: { n: number };
    eyesOnlyCount: { n: number };
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

  // Smaller preferred desks first, then Eyes Only / 9&10, then everyone else.
  const preferredKeys = [...queues.keys()]
    .filter((k) => PREFERRED_NEWS_SOURCE_IDS.has(k) || k === "src_910_sports")
    .sort((a, b) => {
      const heavyA =
        HEAVY_FREE_WIRE_SOURCE_IDS.has(a) || EYES_ONLY_SOURCE_IDS.has(a) ? 1 : 0;
      const heavyB =
        HEAVY_FREE_WIRE_SOURCE_IDS.has(b) || EYES_ONLY_SOURCE_IDS.has(b) ? 1 : 0;
      return heavyA - heavyB;
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
      if (
        EYES_ONLY_SOURCE_IDS.has(key) &&
        options.eyesOnlyCount.n >= options.maxEyesOnly
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
        const eyes = isEyesOnlyCluster(next);
        if (eyes && options.eyesOnlyCount.n >= options.maxEyesOnly) continue;
        used.add(next.id);
        counts.set(key, (counts.get(key) ?? 0) + 1);
        if (sports) options.sportsCount.n += 1;
        if (re) options.reCount.n += 1;
        if (up) options.upNorthCount.n += 1;
        if (eyes) options.eyesOnlyCount.n += 1;
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
 * 9&10 News is capped as heavy TV wire. Eyes Only Media (Ticker + Northern
 * Express + TCBN) shares one owner-family cap of 2 like Record-Eagle.
 * UpNorthLive and Record-Eagle stay capped. Official city/county/tribal
 * headlines get a few reserved slots.
 * preferHardNews (letter): hard free + RE before soft lifestyle fillers;
 * Eyes Only hard news is deferred so IPR / Glen Arbor / government win first.
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
  const maxEyesOnly = options.maxEyesOnly ?? 2;
  const maxOfficial = options.maxOfficial ?? 2;
  const preferHardNews = options.preferHardNews ?? false;
  const now = options.now ?? new Date();

  const eligible = clusters
    .filter((c) => !c.is_original)
    .filter((c) => !c.sources.some((s) => isAlertSourceId(s.id)))
    .filter((c) => !isOutletHomepageUrl(c.url))
    .filter((c) => !isLifestyleJunk(c))
    .filter((c) => !looksLikeCivicListing(c))
    .filter((c) => getSiteId() !== "ann-arbor" || !looksLikeUmVarsity(c))
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
  const hardFree = freeNews.filter(looksLikeHardNews);
  const softFree = freeNews.filter((c) => !looksLikeHardNews(c));
  const hardRe = reNews.filter(looksLikeHardNews);
  const softRe = reNews.filter((c) => !looksLikeHardNews(c));
  const officialNews = freeNews.filter(isOfficialNewsCluster);

  const picked: ClusteredStory[] = [];
  const counts = new Map<string, number>();
  const used = new Set<string>();
  const sportsCount = { n: 0 };
  const reCount = { n: 0 };
  const upNorthCount = { n: 0 };
  const eyesOnlyCount = { n: 0 };

  const underHeavy = (key: string) =>
    !HEAVY_FREE_WIRE_SOURCE_IDS.has(key) ||
    (counts.get(key) ?? 0) < maxHeavyWire;

  const underEyesOnly = () => eyesOnlyCount.n < maxEyesOnly;

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
    if (isEyesOnlyCluster(c) && !underEyesOnly()) continue;
    used.add(c.id);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (isEyesOnlyCluster(c)) eyesOnlyCount.n += 1;
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
    if (isEyesOnlyCluster(c) && !underEyesOnly()) continue;
    used.add(c.id);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (isEyesOnlyCluster(c)) eyesOnlyCount.n += 1;
    picked.push(c);
  }

  const poolOpts = {
    maxPerSource,
    maxSports,
    maxRecordEagle,
    maxUpNorth,
    maxHeavyWire,
    maxEyesOnly,
    sportsCount,
    reCount,
    upNorthCount,
    eyesOnlyCount,
  };

  if (preferHardNews) {
    // Letter: smaller preferred desks' hard news first (IPR / Glen Arbor /
    // government) before Eyes Only or 9&10 flood the top-6 slice. Then hard
    // RE, one soft local filler, then Eyes Only hard, then heavy TV hard.
    const smallHard = hardFree.filter(
      (c) =>
        !HEAVY_FREE_WIRE_SOURCE_IDS.has(primarySourceKey(c)) &&
        !isEyesOnlyCluster(c),
    );
    const eyesHard = hardFree.filter(isEyesOnlyCluster);
    const heavyHard = hardFree.filter((c) =>
      HEAVY_FREE_WIRE_SOURCE_IDS.has(primarySourceKey(c)),
    );
    takeFromPool(smallHard, picked, used, counts, {
      ...poolOpts,
      limit: freeTarget,
    });
    takeFromPool(hardRe, picked, used, counts, { ...poolOpts, limit });
    // Keep one soft local slot near the front so festivals are not zeroed.
    const softTarget = Math.min(picked.length + 1, freeTarget);
    takeFromPool(softFree, picked, used, counts, {
      ...poolOpts,
      limit: softTarget,
    });
    takeFromPool(eyesHard, picked, used, counts, {
      ...poolOpts,
      limit: freeTarget,
    });
    takeFromPool(heavyHard, picked, used, counts, {
      ...poolOpts,
      limit: freeTarget,
    });
    takeFromPool(sports, picked, used, counts, { ...poolOpts, limit });
    takeFromPool(softRe, picked, used, counts, { ...poolOpts, limit });
    takeFromPool(upNorthNews, picked, used, counts, { ...poolOpts, limit });
    // Remaining soft after hard+heavy.
    takeFromPool(softFree, picked, used, counts, {
      ...poolOpts,
      limit: freeTarget,
    });
  } else {
    // 2) Preferred free desks (smaller desks before Eyes Only / 9&10), then others.
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
  }

  // Soft fill under caps — still respect heavy-wire + Eyes Only limits.
  if (picked.length < limit) {
    const fillOrder = preferHardNews
      ? [
          ...hardFree.filter((c) => !isEyesOnlyCluster(c)),
          ...hardRe,
          ...softFree.filter((c) => !isEyesOnlyCluster(c)),
          ...hardFree.filter(isEyesOnlyCluster),
          ...softFree.filter(isEyesOnlyCluster),
          ...sports,
          ...softRe,
          ...upNorthNews,
        ]
      : [...freeNews, ...sports, ...reNews, ...upNorthNews];
    for (const c of fillOrder) {
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
      const eyesItem = isEyesOnlyCluster(c);
      if (eyesItem && eyesOnlyCount.n >= maxEyesOnly) continue;
      used.add(c.id);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      if (sportsItem) sportsCount.n += 1;
      if (reItem) reCount.n += 1;
      if (upItem) upNorthCount.n += 1;
      if (eyesItem) eyesOnlyCount.n += 1;
      picked.push(c);
    }
  }

  return picked;
}
