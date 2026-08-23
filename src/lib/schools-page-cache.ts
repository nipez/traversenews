import staticSchools from "@/data/schools-important-2026-27.json";
import {
  groupSchoolDaysByDistrict,
  SCHOOL_DISTRICT_CALENDAR_PDF_URLS,
  SCHOOL_DISTRICT_CALENDAR_URLS,
  selectUpcomingSchoolDays,
} from "@/lib/schools";
import type { SchoolCalendarItem } from "@/lib/types";

export type SchoolsPageDistrict = {
  district: string;
  calendarUrl: string | null;
  calendarPdfUrl: string | null;
  months: Array<{
    key: string;
    name: string;
    items: SchoolCalendarItem[];
  }>;
};

export type SchoolsPagePayload = {
  districts: SchoolsPageDistrict[];
  cached_at: string;
};

/**
 * Public /schools — in-worker static JSON only.
 * Zero KV gets, zero KV lists, zero KV puts on the request path.
 * Do not read app_data or per-date keys here (free-plan KV caps).
 */
export function getSchoolsPagePayload(
  now = new Date(),
): SchoolsPagePayload {
  const rows = staticSchools as SchoolCalendarItem[];
  const upcoming = selectUpcomingSchoolDays(rows, now);
  const grouped = groupSchoolDaysByDistrict(upcoming, { includeEmpty: false });

  const districts = grouped.map((block) => ({
    district: block.district,
    calendarUrl: SCHOOL_DISTRICT_CALENDAR_URLS[block.district] || null,
    calendarPdfUrl: SCHOOL_DISTRICT_CALENDAR_PDF_URLS[block.district] || null,
    months: block.months,
  }));

  return {
    districts,
    cached_at: "static",
  };
}

/** No-op: public /schools does not use KV caches. */
export async function refreshSchoolsPageCaches(): Promise<void> {
  return;
}

/** No-op: public /schools does not use KV caches. */
export async function invalidateSchoolsPageCache(): Promise<void> {
  return;
}
