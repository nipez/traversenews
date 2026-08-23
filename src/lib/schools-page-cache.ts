import { getTraverseDataKv, STORE_KEY } from "@/lib/data/kv";
import {
  groupSchoolDaysByDistrict,
  SCHOOL_DISTRICT_CALENDAR_PDF_URLS,
  SCHOOL_DISTRICT_CALENDAR_URLS,
  selectUpcomingSchoolDays,
  sourceIdForDistrict,
} from "@/lib/schools";
import type { SchoolCalendarItem, Source } from "@/lib/types";

/** Precomputed /schools districts — one small KV get on public hits. */
const SCHOOLS_PAGE_CACHE_KEY = "cache:schools.page:v2";
/** Slim schools + calendar URL fields — avoid parsing full app_data on miss. */
const SCHOOLS_SLICE_CACHE_KEY = "cache:schools.slice:v2";
/** Minutes — keep /schools off full-store normalize on every hit (CF 1102). */
const SCHOOLS_PAGE_TTL_SECONDS = 30 * 60;

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

export type SchoolsSlice = {
  schools: SchoolCalendarItem[];
  sources: Array<Pick<Source, "id" | "calendar_url" | "calendar_pdf_url">>;
};

function emptySlice(): SchoolsSlice {
  return { schools: [], sources: [] };
}

function sliceFromAppDataBlob(raw: string): SchoolsSlice {
  const data = JSON.parse(raw) as {
    schools?: SchoolCalendarItem[];
    sources?: Array<
      Pick<Source, "id" | "calendar_url" | "calendar_pdf_url">
    >;
  };
  return {
    schools: Array.isArray(data.schools) ? data.schools : [],
    sources: Array.isArray(data.sources)
      ? data.sources.map((s) => ({
          id: s.id,
          calendar_url: s.calendar_url ?? null,
          calendar_pdf_url: s.calendar_pdf_url ?? null,
        }))
      : [],
  };
}

/**
 * Prefer the slim slice key. Fall back to one app_data read (no normalize).
 * Never writes the full store.
 */
export async function loadSchoolsSlice(): Promise<SchoolsSlice> {
  const kv = await getTraverseDataKv();
  if (!kv) return emptySlice();
  try {
    const slim = await kv.get(SCHOOLS_SLICE_CACHE_KEY, "text");
    if (slim) {
      const parsed = JSON.parse(slim) as SchoolsSlice;
      if (parsed && Array.isArray(parsed.schools)) {
        return {
          schools: parsed.schools,
          sources: Array.isArray(parsed.sources) ? parsed.sources : [],
        };
      }
    }

    const raw = await kv.get(STORE_KEY, "text");
    if (!raw) return emptySlice();
    const slice = sliceFromAppDataBlob(raw);
    // Warm slim key so later misses stay off the fat blob.
    await writeSchoolsSliceCache(slice);
    return slice;
  } catch {
    return emptySlice();
  }
}

export function buildSchoolsPagePayload(slice: SchoolsSlice): SchoolsPagePayload {
  const upcoming = selectUpcomingSchoolDays(slice.schools);
  const grouped = groupSchoolDaysByDistrict(upcoming, { includeEmpty: false });
  const byId = new Map(slice.sources.map((s) => [s.id, s]));

  const districts = grouped.map((block) => {
    const sourceId = sourceIdForDistrict(block.district);
    const source = sourceId ? byId.get(sourceId) : undefined;
    const calendarUrl =
      source?.calendar_url ||
      SCHOOL_DISTRICT_CALENDAR_URLS[block.district] ||
      null;
    const calendarPdfUrl =
      source?.calendar_pdf_url ||
      SCHOOL_DISTRICT_CALENDAR_PDF_URLS[block.district] ||
      null;
    return {
      district: block.district,
      calendarUrl,
      calendarPdfUrl,
      months: block.months,
    };
  });

  return {
    districts,
    cached_at: new Date().toISOString(),
  };
}

export async function readCachedSchoolsPage(): Promise<SchoolsPagePayload | null> {
  const kv = await getTraverseDataKv();
  if (!kv) return null;
  try {
    const raw = await kv.get(SCHOOLS_PAGE_CACHE_KEY, "text");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SchoolsPagePayload;
    if (!parsed || !Array.isArray(parsed.districts)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeCachedSchoolsPage(
  payload: SchoolsPagePayload,
): Promise<void> {
  const kv = await getTraverseDataKv();
  if (!kv) return;
  try {
    await kv.put(SCHOOLS_PAGE_CACHE_KEY, JSON.stringify(payload), {
      expirationTtl: SCHOOLS_PAGE_TTL_SECONDS,
    });
  } catch {
    // Miss next time is fine.
  }
}

export async function writeSchoolsSliceCache(slice: SchoolsSlice): Promise<void> {
  const kv = await getTraverseDataKv();
  if (!kv) return;
  try {
    await kv.put(SCHOOLS_SLICE_CACHE_KEY, JSON.stringify(slice), {
      expirationTtl: SCHOOLS_PAGE_TTL_SECONDS,
    });
  } catch {
    // ignore
  }
}

/**
 * After Desk import: write slim slice + warm page payload so the next
 * public GET is a single small KV read (no app_data parse).
 */
export async function refreshSchoolsPageCaches(slice: SchoolsSlice): Promise<void> {
  const payload = buildSchoolsPagePayload(slice);
  await writeSchoolsSliceCache(slice);
  await writeCachedSchoolsPage(payload);
}

/** @deprecated Prefer refreshSchoolsPageCaches after import. */
export async function invalidateSchoolsPageCache(): Promise<void> {
  const kv = await getTraverseDataKv();
  if (!kv) return;
  try {
    await kv.put(SCHOOLS_PAGE_CACHE_KEY, "", { expirationTtl: 1 });
    await kv.put(SCHOOLS_SLICE_CACHE_KEY, "", { expirationTtl: 1 });
  } catch {
    // ignore
  }
}

/** Public /schools: cached districts only. Never full-store normalize. */
export async function getSchoolsPagePayload(): Promise<SchoolsPagePayload> {
  const cached = await readCachedSchoolsPage();
  if (cached) return cached;

  const slice = await loadSchoolsSlice();
  const payload = buildSchoolsPagePayload(slice);
  await writeCachedSchoolsPage(payload);
  return payload;
}

export {
  SCHOOLS_PAGE_CACHE_KEY,
  SCHOOLS_SLICE_CACHE_KEY,
  SCHOOLS_PAGE_TTL_SECONDS,
};
