import { ALERT_SOURCE_IDS } from "@/lib/alert-sources";
import { shortHash } from "@/lib/events";
import { isAlertSource, sourceById } from "@/lib/source-lanes";
import type { Source, Story } from "@/lib/types";

export { ALERT_SOURCE_IDS, TRAVERSE_ALERT_SOURCES } from "@/lib/alert-sources";

/**
 * True when this source belongs on the Alerts strip (and must stay off Around
 * the bay). Allowlist IDs win even when cluster pills omit `lane` (bay filter
 * only sees `{ id, name }`). Lane / FALLBACK still covers AA and future cities.
 */
export function isAlertSourceId(
  sourceId: string,
  sources?: Source[],
): boolean {
  if (ALERT_SOURCE_IDS.has(sourceId)) return true;
  return isAlertSource(sourceById(sources, sourceId), sourceId);
}

/**
 * Map a Facebook permalink to an agency alert source when the page path/id is
 * known. Returns null for unknown URLs (caller keeps default).
 */
export function inferAlertSourceIdFromUrl(url: string): string | null {
  const raw = url.trim();
  if (!raw) return null;
  let host = "";
  let path = "";
  let search = "";
  try {
    const u = new URL(raw);
    host = u.hostname.replace(/^www\./i, "").toLowerCase();
    path = u.pathname;
    search = u.search;
  } catch {
    return null;
  }
  if (
    host !== "facebook.com" &&
    host !== "m.facebook.com" &&
    host !== "fb.com" &&
    host !== "fb.watch"
  ) {
    return null;
  }

  const pathLower = path.toLowerCase();
  const idMatch = /[?&]id=(\d+)/i.exec(search);
  const pageId = idMatch?.[1] ?? "";

  // GTCRC — profile id + vanity /p/… path
  if (
    pageId === "100064583803947" ||
    /\/p\/grand-traverse-county-road-commission/i.test(pathLower) ||
    /(?:^|\/)gtcrc(?:\/|$)/i.test(pathLower)
  ) {
    return "src_gtcrc";
  }

  // Grand Traverse 911
  if (/(?:^|\/)grandtraverse911(?:\/|$)/i.test(pathLower)) {
    return "src_gt911";
  }

  // BATA Transit Official
  if (/(?:^|\/)batatransit(?:\/|$)/i.test(pathLower)) {
    return "src_bata_fb";
  }

  // Ticker Facebook — explicit so callers can distinguish from unknown
  if (/(?:^|\/)traversecityticker(?:\/|$)/i.test(pathLower)) {
    return "src_ticker_fb";
  }

  return null;
}

/**
 * Prefer agency credit from the Facebook URL when known; otherwise keep the
 * provided / default source id (typically ticker_fb or gt911).
 */
export function resolveAlertSourceId(
  url: string,
  providedSourceId?: string | null,
  defaultSourceId = "src_gt911",
): string {
  const inferred = inferAlertSourceIdFromUrl(url);
  if (inferred) return inferred;
  const provided =
    typeof providedSourceId === "string" ? providedSourceId.trim() : "";
  return provided || defaultSourceId;
}

export type AlertItem = Story & { source_name: string };

/**
 * Real pulled alert stories only. Newest first, max 3.
 * Empty → caller must hide the strip (no dummy copy).
 */
export function selectAlerts(
  stories: Story[],
  sources: Source[],
  options: { limit?: number } = {},
): AlertItem[] {
  const limit = options.limit ?? 3;
  const nameById = new Map(sources.map((s) => [s.id, s.name]));

  return stories
    .filter((s) => !s.is_original && isAlertSourceId(s.source_id, sources))
    .filter((s) => s.title.trim().length > 0 && s.url.trim().length > 0)
    .sort(
      (a, b) =>
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
    )
    .slice(0, limit)
    .map((s) => ({
      ...s,
      source_name: nameById.get(s.source_id) ?? "Alert",
    }));
}

export function stableStoryId(sourceId: string, url: string): string {
  return `story_${shortHash(`${sourceId}:${url.trim()}`)}`;
}
