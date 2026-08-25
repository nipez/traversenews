import { shortHash } from "@/lib/events";
import { dedupeAlertIncidents } from "@/lib/alert-incidents";
import type { Source, Story } from "@/lib/types";

export {
  alertsSameIncident,
  dedupeAlertIncidents,
  normalizeAlertTitle,
  preferAlertCard,
  type AlertIncidentFields,
} from "@/lib/alert-incidents";

/**
 * Homepage Alerts strip sources (Facebook tip wires).
 * Public safety / breaking only — never Overheard memes or Around the bay RSS.
 */
export const ALERT_SOURCE_IDS = new Set(["src_gt911", "src_ticker_fb"]);

export function isAlertSourceId(sourceId: string): boolean {
  return ALERT_SOURCE_IDS.has(sourceId);
}

export type AlertItem = Story & { source_name: string };

/**
 * Real pulled alert stories only. Newest first, max 3 distinct incidents.
 * Empty → caller must hide the strip (no dummy copy).
 */
export function selectAlerts(
  stories: Story[],
  sources: Source[],
  options: { limit?: number } = {},
): AlertItem[] {
  const limit = options.limit ?? 3;
  const nameById = new Map(sources.map((s) => [s.id, s.name]));

  const candidates = stories
    .filter((s) => !s.is_original && isAlertSourceId(s.source_id))
    .filter((s) => s.title.trim().length > 0 && s.url.trim().length > 0);

  return dedupeAlertIncidents(candidates)
    .slice(0, limit)
    .map((s) => ({
      ...s,
      source_name: nameById.get(s.source_id) ?? "Alert",
    }));
}

export function stableStoryId(sourceId: string, url: string): string {
  return `story_${shortHash(`${sourceId}:${url.trim()}`)}`;
}
