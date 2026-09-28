/**
 * ArbiterLive HS athletics pull for Traverse City + map-ring schools.
 *
 * Flow (verified from Worker/datacenter):
 * 1. GET /School/Calendar/{id} — sets SchoolId (+ session) cookies
 * 2. POST /School/GetEventsByEntity/ with startDate/endDate form body
 * 3. Games live in JSON-string field EventsFilteredDetailString
 *
 * Never invents games. Skips canceled/postponed and middle-school rows.
 */
import { detroitWallToUtc } from "@/lib/dates";
import { schoolFromSourceId, stableAthleticsId } from "@/lib/athletics";
import { getSite } from "@/lib/sites";
import type { AthleticsGame, Source } from "@/lib/types";
import type { AthleticsPullResult } from "@/lib/pull/html-athletics";

/** Rolling pull window — today through +21 Detroit calendar days. */
export const ARBITERLIVE_HORIZON_DAYS = 21;

/**
 * ArbiterLive School entity IDs for Traverse Desk athletics sources.
 * Missing map-ring schools are listed in ARBITERLIVE_MISSING_SCHOOLS.
 */
export const ARBITERLIVE_SCHOOL_IDS: Record<string, number> = {
  src_tcc_ath: 23592, // Traverse City Central High School
  src_tcw_ath: 23596, // Traverse City West High School
  src_tcsf_ath: 37891, // Traverse City St. Francis High School
  src_tcch_ath: 23593, // Traverse City Christian School
  src_elk_ath: 6836, // Elk Rapids High School
  src_suttons_ath: 22817, // Suttons Bay High School
  src_leland_ath: 12644, // Leland High School (MI 49654)
  src_glenlake_ath: 13733, // Glen Lake High School
  src_kingsley_ath: 11844, // Kingsley Area High School
  src_benzie_ath: 39471, // Benzie Central High School
  src_frankfort_ath: 7888, // Frankfort High School (MI 49635)
  src_kalkaska_ath: 11540, // Kalkaska High School
  src_forest_ath: 7683, // Forest Area High School
  src_mancelona_ath: 13642, // Mancelona High School
  src_buckley_ath: 2676, // Buckley Community School
  src_northport_ath: 16521, // Northport Public School (MI 49670)
  src_centrallake_ath: 3765, // Central Lake High School
};

/** Schools we searched for on ArbiterLive but could not wire (none today). */
export const ARBITERLIVE_MISSING_SCHOOLS: string[] = [];

export const ARBITERLIVE_ATHLETICS_SOURCE_IDS = new Set(
  Object.keys(ARBITERLIVE_SCHOOL_IDS),
);

export function arbiterLiveCalendarUrl(schoolId: number): string {
  return `https://arbiterlive.com/School/Calendar/${schoolId}`;
}

export function arbiterLiveSchoolId(sourceId: string): number | null {
  const id = ARBITERLIVE_SCHOOL_IDS[sourceId];
  return typeof id === "number" ? id : null;
}

type ArbiterEvent = {
  title?: string;
  start?: string;
  end?: string;
  url?: string;
  isAwayGame?: boolean;
  itemType?: string;
  allDay?: boolean;
};

function stripHtml(raw: string): string {
  return raw
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

/** True when the printed title marks the game canceled or postponed. */
export function isCanceledOrPostponedTitle(title: string): boolean {
  const t = title.toLowerCase();
  return (
    /\bcanceled\b/.test(t) ||
    /\bcancelled\b/.test(t) ||
    /\bpostponed\b/.test(t)
  );
}

/**
 * Middle-school / 6–8 rows — Varsity/JV/Freshman stay.
 * Matches titles like "Middle School …", "7/8th …", "6th/7th/8th …".
 */
export function isMiddleSchoolTitle(title: string): boolean {
  const t = title.toLowerCase();
  if (/\bmiddle school\b/.test(t)) return true;
  if (/\b7\s*\/\s*8(?:th)?\b/.test(t)) return true;
  if (/\b6(?:th)?\s*\/\s*7(?:th)?\s*\/\s*8(?:th)?\b/.test(t)) return true;
  if (/\b(?:6th|7th|8th)\b/.test(t) && !/\b(?:varsity|junior varsity|jv|freshman|frosh)\b/.test(t)) {
    return true;
  }
  return false;
}

/**
 * ArbiterLive local wall clock: "9/29/2026 6:45 PM" (America/Detroit).
 * Never invents a kickoff — returns null when the stamp cannot be parsed.
 */
export function parseArbiterLiveStart(raw: string): Date | null {
  const text = raw.replace(/\s+/g, " ").trim();
  const m = text.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*([AaPp][Mm]))?$/,
  );
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  const year = Number(m[3]);
  if (!month || !day || !year || month > 12 || day > 31) return null;

  if (!m[4] || !m[5] || !m[6]) {
    // All-day / midnight stamp — keep midnight Detroit, mark time_unknown upstream.
    return detroitWallToUtc(year, month, day, 0, 0, 0);
  }

  const hour12 = Number(m[4]);
  const minute = Number(m[5]);
  if (hour12 < 1 || hour12 > 12 || minute > 59) return null;
  const mer = m[6].toLowerCase();
  let hour = hour12 % 12;
  if (mer.startsWith("p")) hour += 12;
  return detroitWallToUtc(year, month, day, hour, minute, 0);
}

function detroitYmd(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Detroit",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function addDetroitDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const utc = detroitWallToUtc(y, m, d, 12, 0, 0);
  const next = new Date(utc.getTime() + days * 24 * 60 * 60 * 1000);
  return detroitYmd(next);
}

function resolveGameUrl(path: string | undefined, schoolId: number): string {
  const raw = (path || "").trim();
  if (!raw) return arbiterLiveCalendarUrl(schoolId);
  if (/^https?:\/\//i.test(raw)) return raw;
  try {
    return new URL(raw, "https://arbiterlive.com").toString();
  } catch {
    return arbiterLiveCalendarUrl(schoolId);
  }
}

function placeFromTitle(title: string, school: string, isAway: boolean): string {
  const at = title.match(/\bat\s+(.+)$/i);
  if (at) return at[1].trim();
  if (isAway) return "Away";
  return school;
}

/**
 * Normalize one ArbiterLive EventsFilteredDetailString payload into AthleticsGame rows.
 * Exported for unit tests — never invents a game.
 */
export function extractArbiterLiveGames(
  detailJson: string,
  source: Source,
  schoolId: number,
  now = new Date(),
): AthleticsGame[] {
  let events: ArbiterEvent[] = [];
  try {
    const parsed = JSON.parse(detailJson) as unknown;
    if (!Array.isArray(parsed)) return [];
    events = parsed as ArbiterEvent[];
  } catch {
    return [];
  }

  const school = schoolFromSourceId(source.id);
  const startKey = detroitYmd(now);
  const endKey = addDetroitDays(startKey, ARBITERLIVE_HORIZON_DAYS);
  const byId = new Map<string, AthleticsGame>();

  for (const ev of events) {
    if ((ev.itemType || "").toLowerCase() !== "game") continue;
    const rawTitle = typeof ev.title === "string" ? ev.title : "";
    if (!rawTitle) continue;
    if (isCanceledOrPostponedTitle(rawTitle)) continue;
    const title = stripHtml(rawTitle);
    if (!title) continue;
    if (isMiddleSchoolTitle(title)) continue;

    const starts = typeof ev.start === "string" ? parseArbiterLiveStart(ev.start) : null;
    if (!starts) continue;
    const dayKey = detroitYmd(starts);
    if (dayKey < startKey || dayKey > endKey) continue;

    const url = resolveGameUrl(ev.url, schoolId);
    const timeUnknown =
      !!ev.allDay ||
      !/\d{1,2}:\d{2}\s*[AaPp][Mm]/.test((ev.start || "").trim());
    const place = placeFromTitle(title, school, ev.isAwayGame === true);
    const uid = `${url}|${starts.toISOString()}|${title}`;
    const game: AthleticsGame = {
      id: stableAthleticsId(source.id, uid),
      title,
      starts_at: starts.toISOString(),
      place,
      url,
      source_id: source.id,
      school,
    };
    if (timeUnknown) game.time_unknown = true;
    byId.set(game.id, game);
  }

  return [...byId.values()].sort(
    (a, b) =>
      new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
}

function cookieHeaderFromResponse(res: Response): string {
  // Workers / undici: getSetCookie when available; else Set-Cookie header.
  const anyHeaders = res.headers as Headers & { getSetCookie?: () => string[] };
  const parts =
    typeof anyHeaders.getSetCookie === "function"
      ? anyHeaders.getSetCookie()
      : [];
  if (parts.length === 0) {
    const single = res.headers.get("set-cookie");
    if (single) parts.push(single);
  }
  const pairs: string[] = [];
  // Last SchoolId= wins (ArbiterLive may set SchoolId=0 then clear then set id).
  const byName = new Map<string, string>();
  for (const raw of parts) {
    const first = raw.split(";")[0]?.trim();
    if (!first || !first.includes("=")) continue;
    const eq = first.indexOf("=");
    const name = first.slice(0, eq);
    const value = first.slice(eq + 1);
    byName.set(name, value);
  }
  for (const [name, value] of byName) {
    pairs.push(`${name}=${value}`);
  }
  return pairs.join("; ");
}

async function fetchCalendarSession(
  schoolId: number,
): Promise<{ ok: boolean; status: number; cookie: string; blocked: boolean }> {
  const url = arbiterLiveCalendarUrl(schoolId);
  const res = await fetch(url, {
    headers: {
      "User-Agent": getSite().userAgent,
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });
  const text = await res.text();
  const blocked =
    res.status === 401 ||
    res.status === 403 ||
    res.status === 429 ||
    /access denied|invalidsite|forbidden|cf-browser-verification/i.test(
      text.slice(0, 800),
    );
  return {
    ok: res.ok,
    status: res.status,
    cookie: cookieHeaderFromResponse(res),
    blocked,
  };
}

async function postEvents(
  schoolId: number,
  cookie: string,
  startDate: string,
  endDate: string,
): Promise<{ ok: boolean; status: number; body: string; blocked: boolean }> {
  const body = new URLSearchParams({
    startDate,
    endDate,
  }).toString();
  const res = await fetch("https://arbiterlive.com/School/GetEventsByEntity/", {
    method: "POST",
    headers: {
      "User-Agent": getSite().userAgent,
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      Referer: arbiterLiveCalendarUrl(schoolId),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body,
    redirect: "follow",
  });
  const text = await res.text();
  const blocked =
    res.status === 401 ||
    res.status === 403 ||
    res.status === 429 ||
    /access denied|invalidsite|forbidden/i.test(text.slice(0, 400));
  return { ok: res.ok, status: res.status, body: text, blocked };
}

/**
 * Pull one school's ArbiterLive calendar for the rolling 21-day window.
 * Requires the Calendar GET first so SchoolId is in the cookie jar.
 */
export async function pullArbiterLiveAthletics(
  source: Source,
  now = new Date(),
): Promise<AthleticsPullResult> {
  const schoolId = arbiterLiveSchoolId(source.id);
  if (!schoolId) {
    return {
      games: [],
      bot_blocked: false,
      status: null,
      error: `No ArbiterLive school id mapped for ${source.id}`,
    };
  }

  const session = await fetchCalendarSession(schoolId);
  if (session.blocked) {
    return { games: [], bot_blocked: true, status: session.status };
  }
  if (!session.ok) {
    throw new Error(
      `ArbiterLive calendar fetch failed ${session.status} for ${source.name}`,
    );
  }
  if (!session.cookie || !/SchoolId=/.test(session.cookie)) {
    return {
      games: [],
      bot_blocked: false,
      status: session.status,
      error:
        "ArbiterLive calendar did not set SchoolId cookie — cannot POST events",
    };
  }

  const startDate = detroitYmd(now);
  const endDate = addDetroitDays(startDate, ARBITERLIVE_HORIZON_DAYS);
  const posted = await postEvents(
    schoolId,
    session.cookie,
    startDate,
    endDate,
  );
  if (posted.blocked) {
    return { games: [], bot_blocked: true, status: posted.status };
  }
  if (!posted.ok) {
    throw new Error(
      `ArbiterLive events POST failed ${posted.status} for ${source.name}`,
    );
  }

  let detail = "[]";
  try {
    const json = JSON.parse(posted.body) as {
      EventsFilteredDetailString?: string;
    };
    detail =
      typeof json.EventsFilteredDetailString === "string"
        ? json.EventsFilteredDetailString
        : "[]";
  } catch {
    throw new Error(
      `ArbiterLive returned non-JSON events for ${source.name}`,
    );
  }

  return {
    games: extractArbiterLiveGames(detail, source, schoolId, now),
    bot_blocked: false,
    status: posted.status,
  };
}
