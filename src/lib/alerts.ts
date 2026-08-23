import { shortHash } from "@/lib/events";
import type { Source, Story } from "@/lib/types";

/**
 * Homepage Alerts strip sources (Facebook tip wires).
 * Public safety / breaking only — never Overheard memes or Around the bay RSS.
 */
export const ALERT_SOURCE_IDS = new Set(["src_gt911"]);

export function isAlertSourceId(sourceId: string): boolean {
  return ALERT_SOURCE_IDS.has(sourceId);
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
    .filter((s) => !s.is_original && isAlertSourceId(s.source_id))
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
