import {
  expandDetroitWeekdayOccurrences,
  isDateOnlyStartsAt,
  parseEventStartsAt,
} from "@/lib/dates";
import { isHsAthleticsEventSource, isSchoolCalendarSource, stableEventId } from "@/lib/events";
import type { EventItem, Source } from "@/lib/types";

export type EventImportRow = {
  title: string;
  /** Explicit occurrence ISO. Naive datetimes = America/Detroit wall time. */
  starts_at?: string;
  place?: string;
  url?: string | null;
  source_id?: string;
  /**
   * Recurring listings (Visit TC): expand from listed weekdays in Detroit.
   * Never invent "tomorrow" or noon guesses. Example: ["Wed","Sat"] + "07:30".
   */
  recurrence_weekdays?: string[];
  recurrence_time?: string;
  recurrence_count?: number;
};

export type EventImportResult = {
  imported: EventItem[];
  source_ids: string[];
  skipped: Array<{ index: number; reason: string }>;
};

const DEFAULT_SOURCE = "src_visit_events";

function pushEvent(
  imported: EventItem[],
  sourceIds: Set<string>,
  sourceId: string,
  title: string,
  starts: Date,
  place: string,
  url: string | null,
  timeUnknown = false,
) {
  const uid = url
    ? `${url}|${starts.toISOString()}`
    : `${title}|${starts.toISOString()}`;
  const row: EventItem = {
    id: stableEventId(sourceId, uid),
    title,
    starts_at: starts.toISOString(),
    place,
    url,
    source_id: sourceId,
  };
  if (timeUnknown) row.time_unknown = true;
  imported.push(row);
  sourceIds.add(sourceId);
}

/**
 * Normalize browser-pulled event rows. Never invents titles/times —
 * invalid or empty rows are skipped with reasons.
 * Recurring rows must declare weekdays + Detroit wall time.
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

    const sourceId =
      (typeof row.source_id === "string" && row.source_id.trim()) ||
      defaultSourceId;
    if (!byId.has(sourceId)) {
      skipped.push({ index, reason: `Unknown source_id: ${sourceId}` });
      return;
    }
    if (isHsAthleticsEventSource(sourceId)) {
      skipped.push({
        index,
        reason:
          "HS athletics calendars are Sports wire, not Events — POST /api/desk/athletics/import",
      });
      return;
    }
    if (isSchoolCalendarSource(sourceId)) {
      skipped.push({
        index,
        reason:
          "District school calendars are /schools, not Events — POST /api/desk/schools/import",
      });
      return;
    }

    const place =
      typeof row.place === "string" && row.place.trim()
        ? row.place.trim()
        : "Traverse City area";
    const url =
      typeof row.url === "string" && row.url.trim() ? row.url.trim() : null;

    const weekdays = Array.isArray(row.recurrence_weekdays)
      ? row.recurrence_weekdays
      : [];
    const recTime =
      typeof row.recurrence_time === "string" ? row.recurrence_time.trim() : "";

    if (weekdays.length > 0) {
      if (!recTime) {
        skipped.push({
          index,
          reason:
            "Recurring row needs recurrence_time (HH:mm Detroit). Do not guess noon.",
        });
        return;
      }
      const occurrences = expandDetroitWeekdayOccurrences(weekdays, recTime, {
        count: row.recurrence_count ?? 2,
      });
      if (occurrences.length === 0) {
        skipped.push({
          index,
          reason:
            "Could not expand recurrence_weekdays — use Wed/Sat etc., not tomorrow.",
        });
        return;
      }
      for (const starts of occurrences) {
        pushEvent(imported, sourceIds, sourceId, title, starts, place, url);
      }
      return;
    }

    const startsRaw =
      typeof row.starts_at === "string" ? row.starts_at.trim() : "";
    if (!startsRaw) {
      skipped.push({
        index,
        reason:
          "Need starts_at (Detroit ISO) or recurrence_weekdays + recurrence_time",
      });
      return;
    }
    const starts = parseEventStartsAt(startsRaw);
    if (!starts) {
      skipped.push({
        index,
        reason:
          "Invalid starts_at — use ISO (naive = Detroit). No today/tomorrow.",
      });
      return;
    }

    // Date-only rows get midnight Detroit + time_unknown — never invent noon.
    pushEvent(
      imported,
      sourceIds,
      sourceId,
      title,
      starts,
      place,
      url,
      isDateOnlyStartsAt(startsRaw),
    );
  });

  return {
    imported,
    source_ids: [...sourceIds],
    skipped,
  };
}
