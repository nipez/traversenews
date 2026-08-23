import {
  detroitDayKey,
  isDateOnlyStartsAt,
  parseEventStartsAt,
} from "@/lib/dates";
import { SCHOOL_CALENDAR_SOURCE_IDS, shortHash } from "@/lib/events";
import type { SchoolCalendarItem, Source } from "@/lib/types";

/** Soft ceiling for district academic calendar rows (not a full season dump). */
export const MAX_STORED_SCHOOLS = 120;

export const SCHOOL_SOURCE_IDS = SCHOOL_CALENDAR_SOURCE_IDS;

export type SchoolImportRow = {
  title: string;
  starts_at?: string;
  place?: string;
  url?: string | null;
  source_id?: string;
  district?: string;
};

export type SchoolImportResult = {
  imported: SchoolCalendarItem[];
  source_ids: string[];
  skipped: Array<{ index: number; reason: string }>;
};

export function districtFromSourceId(sourceId: string): string {
  switch (sourceId) {
    case "src_tcaps_cal":
      return "TCAPS";
    case "src_gtacs_cal":
      return "GTACS";
    case "src_elk_cal":
      return "Elk Rapids";
    case "src_suttons_cal":
      return "Suttons Bay";
    case "src_leland_cal":
      return "Leland";
    case "src_glenlake_cal":
      return "Glen Lake";
    case "src_kingsley_cal":
      return "Kingsley";
    case "src_tcch_cal":
      return "TC Christian";
    default:
      return "Schools";
  }
}

export function stableSchoolId(sourceId: string, uid: string): string {
  return `sch_${shortHash(`${sourceId}:${uid}`)}`;
}

/**
 * Keep school calendars in their own array. Soft-cap preferring upcoming.
 * Never invents half days — only drops.
 */
export function sanitizeStoredSchools(items: SchoolCalendarItem[]): {
  items: SchoolCalendarItem[];
  changed: boolean;
} {
  const allowed = items.filter((g) => SCHOOL_SOURCE_IDS.has(g.source_id));
  const byId = new Map<string, SchoolCalendarItem>();
  for (const g of allowed) {
    byId.set(g.id, g);
  }
  let next = [...byId.values()].sort(
    (a, b) =>
      new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
  let changed = next.length !== items.length;

  if (next.length > MAX_STORED_SCHOOLS) {
    const now = Date.now();
    const upcoming = next.filter(
      (g) => new Date(g.starts_at).getTime() >= now - 12 * 60 * 60 * 1000,
    );
    const past = next
      .filter((g) => new Date(g.starts_at).getTime() < now - 12 * 60 * 60 * 1000)
      .sort(
        (a, b) =>
          new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime(),
      );
    const room = Math.max(0, MAX_STORED_SCHOOLS - upcoming.length);
    next = [...upcoming, ...past.slice(0, room)].sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    );
    changed = true;
  }

  return { items: next, changed };
}

/** Public /schools: from Detroit start-of-today forward (no invented days). */
export function selectUpcomingSchoolDays(
  items: SchoolCalendarItem[],
  now = new Date(),
): SchoolCalendarItem[] {
  const todayKey = detroitDayKey(now);
  return sanitizeStoredSchools(items)
    .items.filter((g) => detroitDayKey(g.starts_at) >= todayKey)
    .sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    );
}

export function groupSchoolDaysByMonth(
  items: SchoolCalendarItem[],
): Array<{
  key: string;
  name: string;
  items: SchoolCalendarItem[];
}> {
  const groups = new Map<string, SchoolCalendarItem[]>();
  for (const item of items) {
    const key = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Detroit",
      year: "numeric",
      month: "2-digit",
    }).format(new Date(item.starts_at));
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, monthItems]) => {
      const name = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Detroit",
        month: "long",
        year: "numeric",
      }).format(new Date(monthItems[0].starts_at));
      return {
        key,
        name,
        items: [...monthItems].sort(
          (a, b) =>
            new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
        ),
      };
    });
}

/**
 * Normalize browser-pulled district calendar rows. Never invents half days.
 * Only SCHOOL_SOURCE_IDS — everything else is skipped.
 */
export function normalizeImportedSchools(
  rows: SchoolImportRow[],
  sources: Source[],
  defaultSourceId?: string,
): SchoolImportResult {
  const byId = new Map(sources.map((s) => [s.id, s]));
  const imported: SchoolCalendarItem[] = [];
  const skipped: SchoolImportResult["skipped"] = [];
  const sourceIds = new Set<string>();

  rows.forEach((row, index) => {
    const title = typeof row.title === "string" ? row.title.trim() : "";
    if (!title) {
      skipped.push({ index, reason: "Missing title" });
      return;
    }

    const sourceId =
      (typeof row.source_id === "string" && row.source_id.trim()) ||
      (defaultSourceId?.trim() ?? "");
    if (!sourceId) {
      skipped.push({
        index,
        reason: "Missing source_id (district calendar desk)",
      });
      return;
    }
    if (!SCHOOL_SOURCE_IDS.has(sourceId)) {
      skipped.push({
        index,
        reason: `source_id must be a school calendar desk (got ${sourceId})`,
      });
      return;
    }
    if (!byId.has(sourceId)) {
      skipped.push({ index, reason: `Unknown source_id: ${sourceId}` });
      return;
    }

    const startsRaw =
      typeof row.starts_at === "string" ? row.starts_at.trim() : "";
    if (!startsRaw) {
      skipped.push({
        index,
        reason:
          "Need starts_at (naive = America/Detroit). Do not invent half days.",
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

    const place =
      typeof row.place === "string" && row.place.trim()
        ? row.place.trim()
        : "Traverse City area";
    const url =
      typeof row.url === "string" && row.url.trim() ? row.url.trim() : null;
    const districtRaw =
      typeof row.district === "string" ? row.district.trim() : "";
    const district = districtRaw || districtFromSourceId(sourceId);
    const timeUnknown = isDateOnlyStartsAt(startsRaw);

    const uid = url
      ? `${url}|${starts.toISOString()}`
      : `${title}|${starts.toISOString()}`;

    const item: SchoolCalendarItem = {
      id: stableSchoolId(sourceId, uid),
      title,
      starts_at: starts.toISOString(),
      place,
      url,
      source_id: sourceId,
      district,
    };
    if (timeUnknown) item.time_unknown = true;

    imported.push(item);
    sourceIds.add(sourceId);
  });

  return {
    imported,
    source_ids: [...sourceIds],
    skipped,
  };
}
