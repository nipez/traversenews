/** Fields used for incident matching (title / place+event / URL). */
export type AlertIncidentFields = {
  title: string;
  dek?: string | null;
  url?: string | null;
};

const ALERT_STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "to",
  "in",
  "on",
  "at",
  "for",
  "from",
  "with",
  "near",
  "after",
  "due",
  "into",
  "over",
  "under",
  "between",
  "along",
  "across",
  "just",
  "now",
  "new",
  "says",
  "said",
  "report",
  "reports",
  "reported",
  "update",
  "updates",
  "latest",
  "area",
  "part",
  "local",
  "county",
  "city",
  "township",
  "road",
  "roads",
  "street",
  "streets",
  "ave",
  "avenue",
  "blvd",
  "drive",
  "dr",
  "rd",
  "st",
  "closed",
  "closes",
  "closing",
  "closure",
  "closures",
  "shut",
  "down",
  "open",
  "reopen",
  "reopened",
  "traffic",
  "detour",
  "detours",
  "alert",
  "alerts",
  "breaking",
  "post",
  "posted",
  "facebook",
  "grand",
  "traverse",
  "ticker",
  "911",
]);

function normalizeAlertUrl(url: string): string {
  return url.trim().replace(/\/+$/, "").toLowerCase();
}

/** Lowercase, strip punctuation, collapse space — for exact title compare. */
export function normalizeAlertTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function alertTokenSet(text: string): Set<string> {
  const norm = normalizeAlertTitle(text);
  const out = new Set<string>();
  for (const raw of norm.split(" ")) {
    if (raw.length < 3) continue;
    if (ALERT_STOPWORDS.has(raw)) continue;
    out.add(raw);
  }
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function sharedTokens(a: Set<string>, b: Set<string>): Set<string> {
  const out = new Set<string>();
  for (const t of a) if (b.has(t)) out.add(t);
  return out;
}

/**
 * Incident fingerprint text: title plus a short dek lead for place cues
 * (e.g. sewer break dek that names South Airport / Logan).
 */
function incidentText(item: AlertIncidentFields): string {
  const title = item.title ?? "";
  const dek = (item.dek ?? "").trim();
  if (!dek) return title;
  // Cap dek influence so long Facebook dumps don't over-match.
  return `${title} ${dek.slice(0, 160)}`;
}

/**
 * True when two alert cards are the same public-safety incident.
 * Matches: same URL, near-identical titles, high token overlap, or
 * shared place+event tokens (e.g. "airport" + "logan").
 */
export function alertsSameIncident(
  a: AlertIncidentFields,
  b: AlertIncidentFields,
): boolean {
  const urlA = typeof a.url === "string" ? normalizeAlertUrl(a.url) : "";
  const urlB = typeof b.url === "string" ? normalizeAlertUrl(b.url) : "";
  if (urlA && urlB && urlA === urlB) return true;

  const titleA = normalizeAlertTitle(a.title ?? "");
  const titleB = normalizeAlertTitle(b.title ?? "");
  if (titleA && titleB && titleA === titleB) return true;

  const tokensA = alertTokenSet(incidentText(a));
  const tokensB = alertTokenSet(incidentText(b));
  if (tokensA.size === 0 || tokensB.size === 0) return false;

  const overlap = jaccard(tokensA, tokensB);
  if (overlap >= 0.48) return true;

  const shared = sharedTokens(tokensA, tokensB);
  // Place + event: two distinctive shared tokens (airport + logan, hammond + three…).
  if (shared.size >= 2 && overlap >= 0.28) return true;

  return false;
}

/**
 * Prefer the fuller public card: dek + real URL beat a thin hand-add.
 * Ties break toward the newer published_at when both are Stories.
 */
export function preferAlertCard<T extends AlertIncidentFields & { published_at?: string }>(
  a: T,
  b: T,
): T {
  const score = (s: AlertIncidentFields & { published_at?: string }) => {
    let n = 0;
    const dek = (s.dek ?? "").trim();
    if (dek) n += 3;
    n += Math.min(dek.length / 60, 2);
    const url = (s.url ?? "").trim();
    if (url.startsWith("http")) n += 2;
    if (s.published_at) {
      const t = new Date(s.published_at).getTime();
      if (!Number.isNaN(t)) n += t / 1e15; // tiny tie-break toward newer
    }
    return n;
  };
  return score(a) >= score(b) ? a : b;
}

/**
 * Collapse near-duplicate alert stories to one card per incident.
 * Prefer dek + real URL within each cluster; then newest first.
 */
export function dedupeAlertIncidents<T extends AlertIncidentFields & { id: string; published_at?: string }>(
  stories: T[],
): T[] {
  const clusters: T[][] = [];

  for (const story of stories) {
    let matched = false;
    for (const cluster of clusters) {
      if (cluster.some((m) => alertsSameIncident(m, story))) {
        cluster.push(story);
        matched = true;
        break;
      }
    }
    if (!matched) clusters.push([story]);
  }

  return clusters
    .map((cluster) => cluster.reduce((best, cur) => preferAlertCard(best, cur)))
    .sort((a, b) => {
      const ta = a.published_at ? new Date(a.published_at).getTime() : 0;
      const tb = b.published_at ? new Date(b.published_at).getTime() : 0;
      return tb - ta;
    });
}
