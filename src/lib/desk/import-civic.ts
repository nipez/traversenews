import {
  isDateOnlyStartsAt,
  parseEventStartsAt,
} from "@/lib/dates";
import {
  isCivicSource,
  isHsAthleticsEventSource,
  isSchoolCalendarSource,
  stableEventId,
} from "@/lib/events";
import type { EventItem, Source } from "@/lib/types";

export type CivicImportRow = {
  title: string;
  starts_at?: string;
  place?: string;
  url?: string | null;
  source_id?: string;
};

export type CivicImportResult = {
  imported: EventItem[];
  source_ids: string[];
  skipped: Array<{ index: number; reason: string }>;
};

const DEFAULT_SOURCE = "src_gt_cal";

/**
 * Normalize browser-pulled civic meeting rows for /civic.
 * Never invents titles or times. Rejects athletics and school calendars.
 */
export function normalizeImportedCivic(
  rows: CivicImportRow[],
  sources: Source[],
  defaultSourceId = DEFAULT_SOURCE,
): CivicImportResult {
  const byId = new Map(sources.map((s) => [s.id, s]));
  const imported: EventItem[] = [];
  const skipped: CivicImportResult["skipped"] = [];
  const sourceIds = new Set<string>();

  rows.forEach((row, index) => {
    const title = typeof row.title === "string" ? row.title.trim() : "";
    if (!title) {
      skipped.push({ index, reason: "Missing title" });
      return;
    }

    const sourceId =
      (typeof row.source_id === "string" && row.source_id.trim()) ||
      defaultSourceId;
    const source = byId.get(sourceId);
    if (!source) {
      skipped.push({ index, reason: `Unknown source_id: ${sourceId}` });
      return;
    }
    if (isHsAthleticsEventSource(sourceId)) {
      skipped.push({
        index,
        reason:
          "HS athletics calendars are Sports wire — POST /api/desk/athletics/import",
      });
      return;
    }
    if (isSchoolCalendarSource(sourceId)) {
      skipped.push({
        index,
        reason:
          "District school calendars are /schools — POST /api/desk/schools/import",
      });
      return;
    }
    if (!isCivicSource(source)) {
      skipped.push({
        index,
        reason: `Source ${sourceId} is not Civic — use beat_government or src_gt_cal`,
      });
      return;
    }

    const startsRaw =
      typeof row.starts_at === "string" ? row.starts_at.trim() : "";
    if (!startsRaw) {
      skipped.push({
        index,
        reason: "Need starts_at (Detroit wall time). Do not invent noon.",
      });
      return;
    }
    const starts = parseEventStartsAt(startsRaw);
    if (!starts) {
      skipped.push({
        index,
        reason:
          "Invalid starts_at — use ISO or YYYY-MM-DD HH:mm (naive = Detroit).",
      });
      return;
    }

    const place =
      typeof row.place === "string" && row.place.trim()
        ? row.place.trim()
        : "Traverse City area";
    const url =
      typeof row.url === "string" && row.url.trim() ? row.url.trim() : null;

    const uid = url
      ? `${url}|${starts.toISOString()}`
      : `${title}|${starts.toISOString()}`;
    const item: EventItem = {
      id: stableEventId(sourceId, uid),
      title,
      starts_at: starts.toISOString(),
      place,
      url,
      source_id: sourceId,
    };
    if (isDateOnlyStartsAt(startsRaw)) item.time_unknown = true;

    imported.push(item);
    sourceIds.add(sourceId);
  });

  return {
    imported,
    source_ids: [...sourceIds],
    skipped,
  };
}
