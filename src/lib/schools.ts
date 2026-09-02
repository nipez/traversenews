import {
  detroitDayKey,
  isDateOnlyStartsAt,
  parseEventStartsAt,
} from "@/lib/dates";
import { SCHOOL_CALENDAR_SOURCE_IDS, shortHash } from "@/lib/events";
import type { SchoolCalendarItem, Source } from "@/lib/types";

/** Soft ceiling for district academic calendar rows (not a full season dump). */
export const MAX_STORED_SCHOOLS = 300;

export const SCHOOL_SOURCE_IDS = SCHOOL_CALENDAR_SOURCE_IDS;

/**
 * Keep /schools to important district dates only.
 * Orientation, half days, no-school, breaks, conferences, first/last day,
 * records day, graduation — not PTA nights, sports, or every elementary listing.
 */
const IMPORTANT_SCHOOL_MARKERS = [
  "half day",
  "half-day",
  "halfday",
  "no school",
  "no-school",
  "noschool",
  "school closed",
  "schools closed",
  "closed for",
  "spring break",
  "winter break",
  "holiday break",
  "christmas break",
  "thanksgiving break",
  "mid-winter",
  "midwinter",
  "conference",
  "conferences",
  "parent-teacher",
  "parent teacher",
  "orientation",
  "records day",
  "record day",
  "teacher work",
  "professional development",
  "pd day",
  "in-service",
  "inservice",
  "first day",
  "last day",
  "graduation",
  "commencement",
  "exam day",
  "exams",
  "finals",
  "count day",
  "mlk",
  "martin luther king",
  "memorial day",
  "labor day",
  "good friday",
  "holiday",
];

/** Noise that should never land on Important dates even if a marker matches. */
const SCHOOL_NOISE_MARKERS = [
  "pta",
  "p.t.a",
  "pfo",
  "booster",
  "athletic",
  "athletics",
  "varsity",
  "jv ",
  "football",
  "soccer",
  "basketball",
  "volleyball",
  "baseball",
  "softball",
  "wrestling",
  "track meet",
  "cross country",
  "swim meet",
  "game vs",
  "vs.",
  "open house social",
  "book fair",
  "spirit night",
  "bingo",
  "fundraiser",
  "carnival",
  "movie night",
  "family fun",
];

/**
 * True when the title looks like a district Important date.
 * Never invents days — only classifies pulled titles.
 */
export function isImportantSchoolDate(title: string): boolean {
  const t = title.toLowerCase().replace(/\s+/g, " ").trim();
  if (!t) return false;
  if (SCHOOL_NOISE_MARKERS.some((m) => t.includes(m))) {
    const closure =
      t.includes("no school") ||
      t.includes("school closed") ||
      t.includes("half day") ||
      t.includes("break");
    if (!closure) return false;
  }
  if (IMPORTANT_SCHOOL_MARKERS.some((m) => t.includes(m))) return true;
  if (
    /\b(first|last)\s+day\b/.test(t) &&
    /\b(school|class|classes|students)\b/.test(t)
  ) {
    return true;
  }
  return false;
}

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
    case "src_gta_cal":
      return "Grand Traverse Academy";
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

/**
 * Display order on /schools. TCAPS first; GTACS (Catholic) is not the
 * same as Grand Traverse Academy (charter, mygta.us).
 */
export const SCHOOL_DISTRICT_ORDER = [
  "TCAPS",
  "GTACS",
  "TC Christian",
  "Grand Traverse Academy",
  "Elk Rapids",
  "Suttons Bay",
  "Leland",
  "Glen Lake",
  "Kingsley",
] as const;

/** Traverse City core — always visible on /schools. */
export const SCHOOL_DISTRICT_CORE = [
  "TCAPS",
  "GTACS",
  "TC Christian",
  "Grand Traverse Academy",
] as const;

export const SCHOOL_DISTRICT_CORE_SET = new Set<string>(SCHOOL_DISTRICT_CORE);

/** Chip text only. Stored district keys stay full names. */
export function schoolDistrictChipLabel(district: string): string {
  if (district === "Grand Traverse Academy") return "GT Academy";
  return district;
}

export function isCoreSchoolDistrict(district: string): boolean {
  return SCHOOL_DISTRICT_CORE_SET.has(district);
}

/**
 * Official full calendars (link out only — do not host/reprint PDFs).
 * From Traverse News district map; do not invent URLs.
 */
export const SCHOOL_DISTRICT_CALENDAR_URLS: Record<string, string> = {
  TCAPS: "https://www.tcaps.net/page/district-board-calendar",
  GTACS:
    "https://gtacs.org/wp-content/uploads/2026/07/Academic-Calendar-2026-27.pdf",
  "Grand Traverse Academy": "https://www.mygta.us/",
  "Elk Rapids":
    "https://elkrapids-cdn.fxbrt.com/downloads/district_files/final_year_at_a_glance_26-27_with_dates.pdf",
  "Suttons Bay":
    "https://suttonsbayschools.com/en-US/school-academic-calendar-1da89303",
  Leland:
    "https://files.smartsites.parentsquare.com/11216/lps_academic_calendar_2026-2027.pdf",
  "Glen Lake":
    "https://www.glenlakeschools.org/documents/school/district-calendar/269495",
  Kingsley:
    "https://www.kingsleyschools.org/_files/ugd/0f375c_05a1e9ae39684525acde9690e13c96e9.pdf",
  "TC Christian": "https://www.tcchristian.org/parents/",
};

/**
 * Optional year PDF alongside the board/parents page.
 * Prefer a 26–27 PDF when posted; until then Nick’s 25–26 Thrillshare file.
 */
export const SCHOOL_DISTRICT_CALENDAR_PDF_URLS: Record<string, string> = {
  TCAPS:
    "https://files-backend.assets.thrillshare.com/documents/asset/uploaded_file/5656/Tcaps/634b1fa5-4fd0-445c-8504-16ecf5f8a427/25-26-REVISED-Calendars-1.28.26.pdf?disposition=inline",
};

export function sourceIdForDistrict(district: string): string | null {
  switch (district) {
    case "TCAPS":
      return "src_tcaps_cal";
    case "GTACS":
      return "src_gtacs_cal";
    case "Grand Traverse Academy":
      return "src_gta_cal";
    case "Elk Rapids":
      return "src_elk_cal";
    case "Suttons Bay":
      return "src_suttons_cal";
    case "Leland":
      return "src_leland_cal";
    case "Glen Lake":
      return "src_glenlake_cal";
    case "Kingsley":
      return "src_kingsley_cal";
    case "TC Christian":
      return "src_tcch_cal";
    default:
      return null;
  }
}

export function stableSchoolId(sourceId: string, uid: string): string {
  return `sch_${shortHash(`${sourceId}:${uid}`)}`;
}

/**
 * Keep school calendars in their own array. Soft-cap preferring upcoming.
 * Drops non-important titles (PTA, sports, elementary firehose).
 * Never invents half days — only drops.
 */
export function sanitizeStoredSchools(items: SchoolCalendarItem[]): {
  items: SchoolCalendarItem[];
  changed: boolean;
} {
  const allowed = items.filter(
    (g) =>
      SCHOOL_SOURCE_IDS.has(g.source_id) && isImportantSchoolDate(g.title),
  );
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
    const capped = [...upcoming, ...past.slice(0, room)].sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    );
    // Overflow of upcoming-only rows must not flag dirty — nothing was dropped.
    if (
      capped.length !== next.length ||
      capped.map((g) => g.id).join(",") !== next.map((g) => g.id).join(",")
    ) {
      next = capped;
      changed = true;
    }
  }

  return { items: next, changed };
}

/** Public /schools: Important dates from Detroit start-of-today forward. */
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

/** Important dates grouped by district, then month. Empty districts omitted unless includeEmpty. */
export function groupSchoolDaysByDistrict(
  items: SchoolCalendarItem[],
  options: { includeEmpty?: boolean } = {},
): Array<{
  district: string;
  months: Array<{ key: string; name: string; items: SchoolCalendarItem[] }>;
}> {
  const includeEmpty = options.includeEmpty !== false;
  const byDistrict = new Map<string, SchoolCalendarItem[]>();
  for (const item of items) {
    const list = byDistrict.get(item.district) ?? [];
    list.push(item);
    byDistrict.set(item.district, list);
  }

  const ordered: Array<{
    district: string;
    months: Array<{ key: string; name: string; items: SchoolCalendarItem[] }>;
  }> = [];

  for (const district of SCHOOL_DISTRICT_ORDER) {
    const districtItems = byDistrict.get(district) ?? [];
    byDistrict.delete(district);
    if (!includeEmpty && districtItems.length === 0) continue;
    ordered.push({
      district,
      months: groupSchoolDaysByMonth(districtItems),
    });
  }

  // Any unexpected district labels (should be rare) — after the bay list.
  const leftovers = [...byDistrict.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );
  for (const [district, districtItems] of leftovers) {
    ordered.push({
      district,
      months: groupSchoolDaysByMonth(districtItems),
    });
  }

  return ordered;
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
 * Only SCHOOL_SOURCE_IDS + Important-date titles — PTA/sports skipped.
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
    if (!isImportantSchoolDate(title)) {
      skipped.push({
        index,
        reason:
          "Not an Important date (half day / no school / break / conference / orientation / first·last day / graduation). PTA and sports stay off /schools.",
      });
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
        : "";
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
      place: place || "District",
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
