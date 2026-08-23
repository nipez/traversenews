import { stableEventId } from "@/lib/events";
import type { EventItem, Source } from "@/lib/types";

export type EventImportRow = {
  title: string;
  starts_at: string;
  place?: string;
  url?: string | null;
  source_id?: string;
};

export type EventImportResult = {
  imported: EventItem[];
  source_ids: string[];
  skipped: Array<{ index: number; reason: string }>;
};

const DEFAULT_SOURCE = "src_visit_events";

/**
 * Normalize browser-pulled event rows. Never invents titles/times —
 * invalid or empty rows are skipped with reasons.
 */
export function normalizeImportedEvents(
  rows: EventImportRow[],
  sources: Source[],
  defaultSourceId = DEFAULT_SOURCE,
): EventImportResult {
  const byId = new Map(sources.map((s) => [s.id, s]));
  const imported: EventItem[] = [];
  const skipped: EventImportResult["skipped"] = [];
  const sourceIds = new Set<string>();

  rows.forEach((row, index) => {
    const title = typeof row.title === "string" ? row.title.trim() : "";
    if (!title) {
      skipped.push({ index, reason: "Missing title" });
      return;
    }

    const startsRaw =
      typeof row.starts_at === "string" ? row.starts_at.trim() : "";
    const starts = startsRaw ? new Date(startsRaw) : null;
    if (!starts || Number.isNaN(starts.getTime())) {
      skipped.push({ index, reason: "Invalid starts_at (need ISO datetime)" });
      return;
    }

    const sourceId =
      (typeof row.source_id === "string" && row.source_id.trim()) ||
      defaultSourceId;
    if (!byId.has(sourceId)) {
      skipped.push({ index, reason: `Unknown source_id: ${sourceId}` });
      return;
    }

    const place =
      typeof row.place === "string" && row.place.trim()
        ? row.place.trim()
        : "Traverse City area";
    const url =
      typeof row.url === "string" && row.url.trim() ? row.url.trim() : null;

    const uid = url || `${title}|${starts.toISOString()}`;
    imported.push({
      id: stableEventId(sourceId, uid),
      title,
      starts_at: starts.toISOString(),
      place,
      url,
      source_id: sourceId,
    });
    sourceIds.add(sourceId);
  });

  return {
    imported,
    source_ids: [...sourceIds],
    skipped,
  };
}
