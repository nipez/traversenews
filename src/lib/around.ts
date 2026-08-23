import type { ClusteredStory } from "@/lib/types";

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

function clusterScore(cluster: ClusteredStory): number {
  let score = 0;
  if (cluster.sources.length > 1) score += 10_000;
  if (looksLikeLocalNews(cluster)) score += 2_000;
  // Recency (ms since epoch, scaled) as tiebreaker within the same tier.
  score += new Date(cluster.published_at).getTime() / 1e12;
  return score;
}

export type AroundSelectOptions = {
  limit?: number;
  /** Soft cap per primary desk. Default 3 of 12. */
  maxPerSource?: number;
};

/**
 * Homepage / edition Around the bay mix:
 * drop lifestyle junk, require real permalinks, prefer multi-source local,
 * interleave desks so one outlet cannot fill the rail.
 */
export function selectAroundTheBay(
  clusters: ClusteredStory[],
  options: AroundSelectOptions = {},
): ClusteredStory[] {
  const limit = options.limit ?? 12;
  const maxPerSource = options.maxPerSource ?? 3;

  const eligible = clusters
    .filter((c) => !c.is_original)
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

  const picked: ClusteredStory[] = [];
  const counts = new Map<string, number>();
  const used = new Set<string>();

  function tryTake(cluster: ClusteredStory, enforceCap: boolean): boolean {
    if (used.has(cluster.id)) return false;
    const key = primarySourceKey(cluster);
    const n = counts.get(key) ?? 0;
    if (enforceCap && n >= maxPerSource) return false;
    used.add(cluster.id);
    counts.set(key, n + 1);
    picked.push(cluster);
    return true;
  }

  // 1) Multi-source clusters first (still under the per-desk cap).
  for (const c of eligible) {
    if (picked.length >= limit) break;
    if (c.sources.length < 2) continue;
    tryTake(c, true);
  }

  // 2) Round-robin remaining singles by desk for a mixed rail.
  const queues = new Map<string, ClusteredStory[]>();
  for (const c of eligible) {
    if (used.has(c.id)) continue;
    const key = primarySourceKey(c);
    const q = queues.get(key) ?? [];
    q.push(c);
    queues.set(key, q);
  }

  let progress = true;
  while (picked.length < limit && progress) {
    progress = false;
    for (const [key, queue] of queues) {
      if (picked.length >= limit) break;
      if ((counts.get(key) ?? 0) >= maxPerSource) continue;
      while (queue.length > 0) {
        const next = queue.shift()!;
        if (tryTake(next, true)) {
          progress = true;
          break;
        }
      }
    }
  }

  // 3) Soft fill: allow one extra slot per desk only if the rail is still short.
  if (picked.length < limit) {
    for (const c of eligible) {
      if (picked.length >= limit) break;
      if (used.has(c.id)) continue;
      const key = primarySourceKey(c);
      if ((counts.get(key) ?? 0) >= maxPerSource + 1) continue;
      used.add(c.id);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      picked.push(c);
    }
  }

  return picked;
}
