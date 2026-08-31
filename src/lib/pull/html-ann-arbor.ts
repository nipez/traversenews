import { detroitDayKey, detroitWallToUtc } from "@/lib/dates";
import { looksLikeLowValueListing, stableEventId } from "@/lib/events";
import { newId } from "@/lib/ids";
import { getSite } from "@/lib/sites";
import { stableShowId } from "@/lib/shows";
import type { EventItem, ShowListing, Source, Story } from "@/lib/types";
import type { HtmlEventsPullResult } from "@/lib/pull/html-events";

const MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const WEEKDAYS =
  "Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday";

const UMS_VENUE_HINT =
  /freighthouse|hill auditorium|power center|rackham|michigan theater|lydia|pease|stamps/i;

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8216;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();
}

function stripTags(s: string): string {
  return decodeEntities(
    s.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
  );
}

function monthNumber(name: string): number | null {
  const n = MONTHS[name.toLowerCase()];
  return n ?? null;
}

function parseClock(
  hour12: number,
  minute: number,
  ap: string,
): { hour: number; minute: number } | null {
  if (!Number.isFinite(hour12) || hour12 < 1 || hour12 > 12) return null;
  if (!Number.isFinite(minute) || minute < 0 || minute > 59) return null;
  const mer = ap.toLowerCase();
  let hour = hour12 % 12;
  if (mer === "p") hour += 12;
  return { hour, minute };
}

function withinDays(d: Date, now: Date, days: number): boolean {
  const t = d.getTime();
  return (
    t >= now.getTime() - 1000 * 60 * 60 * 12 &&
    t <= now.getTime() + 1000 * 60 * 60 * 24 * days
  );
}

function fetchHeaders(): HeadersInit {
  return {
    "User-Agent": `Mozilla/5.0 (compatible; ${getSite().userAgent})`,
    Accept: "text/html,application/xhtml+xml,application/rss+xml",
  };
}

/**
 * Granicus Legistar Calendar.aspx rows: name, MM/DD/YYYY, iCal, printed clock, place.
 * Never invent a clock — missing/placeholder time → time_unknown at midnight Detroit.
 */
export function extractLegistarMeetings(
  html: string,
  source: Source,
  now = new Date(),
): EventItem[] {
  const rows = html.match(
    /<tr class="rg(?:Row|AltRow)"[\s\S]*?<\/tr>/gi,
  );
  if (!rows) return [];
  const out: EventItem[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const tds = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(
      (m) => m[1],
    );
    if (tds.length < 4) continue;
    const title = stripTags(tds[0] ?? "");
    if (!title) continue;
    const dateText = stripTags(tds[1] ?? "");
    const dateM = dateText.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!dateM) continue;
    const month = Number(dateM[1]);
    const day = Number(dateM[2]);
    const year = Number(dateM[3]);
    const timeText = stripTags(tds[3] ?? "");
    const timeM = timeText.match(/^(\d{1,2}):(\d{2})\s*([ap])\.?m\.?$/i);
    let starts: Date;
    let timeUnknown = false;
    if (timeM) {
      const clock = parseClock(Number(timeM[1]), Number(timeM[2]), timeM[3]);
      if (!clock) continue;
      starts = detroitWallToUtc(year, month, day, clock.hour, clock.minute, 0);
    } else {
      starts = detroitWallToUtc(year, month, day, 0, 0, 0);
      timeUnknown = true;
    }
    if (Number.isNaN(starts.getTime())) continue;
    if (starts.getTime() < now.getTime() - 1000 * 60 * 60 * 12) continue;

    const locRaw = tds[4] ?? "";
    const locFirst = locRaw.split(/<br\s*\/?>|<em\b/i)[0] ?? "";
    const place = stripTags(locFirst) || "Ann Arbor";

    const detailHref = decodeEntities(
      row.match(
        /hypMeetingDetail[^>]*href="([^"]+)"/i,
      )?.[1] ?? "",
    );
    const url = detailHref
      ? new URL(detailHref, "https://a2gov.legistar.com/").href
      : source.feed_url;
    const meetingId = detailHref.match(/[?&]ID=(\d+)/i)?.[1];
    const uid = meetingId || `${title}|${starts.toISOString()}`;
    if (seen.has(uid)) continue;
    seen.add(uid);

    const item: EventItem = {
      id: stableEventId(source.id, uid),
      title,
      starts_at: starts.toISOString(),
      place,
      url,
      source_id: source.id,
    };
    if (timeUnknown) item.time_unknown = true;
    out.push(item);
  }

  return out.sort(
    (a, b) =>
      new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
}

export function collectArkEventLinks(html: string): string[] {
  const found = new Set<string>();
  const re = /https:\/\/theark\.org\/event\/[a-z0-9-]+\/?/gi;
  for (const m of html.matchAll(re)) {
    const url = m[0].replace(/\/?$/, "/");
    if (!/\/event\//.test(url)) continue;
    found.add(url);
  }
  return [...found];
}

export function collectArkListPages(html: string): string[] {
  const found = new Set<string>();
  for (const m of html.matchAll(
    /https:\/\/theark\.org\/events\/list\/page\/(\d+)\/?/gi,
  )) {
    found.add(`https://theark.org/events/list/page/${m[1]}/`);
  }
  return [...found].sort();
}

/**
 * Tribe event page. Clock from the first tribe-event-date-start (or Show Starts)
 * plus dtstart year. Never use RSS pubDate (midnight UTC).
 */
export function extractArkEventFromPage(
  html: string,
  pageUrl: string,
  source: Source,
  now = new Date(),
): EventItem | null {
  const dateStart = stripTags(
    html.match(/tribe-event-date-start[^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? "",
  );
  const dt = html.match(
    /dtstart"[^>]*title="(\d{4})-(\d{2})-(\d{2})"/i,
  );
  const withTime = dateStart.match(
    /([A-Za-z]+)\s+(\d{1,2})(?:\s*,?\s*(\d{4}))?\s*@\s*(\d{1,2}):(\d{2})\s*([ap])\.?m/i,
  );
  const dateOnly = dateStart.match(
    /([A-Za-z]+)\s+(\d{1,2})(?:\s*,?\s*(\d{4}))?/i,
  );
  const showStarts = stripTags(
    html.match(
      /Show Starts:[\s\S]{0,240}?(\d{1,2}:\d{2}\s*[ap]\.?m\.?)/i,
    )?.[1] ?? "",
  );

  let year: number | null = dt ? Number(dt[1]) : null;
  let month: number | null = dt ? Number(dt[2]) : null;
  let day: number | null = dt ? Number(dt[3]) : null;
  let hour = 0;
  let minute = 0;
  let timeUnknown = true;

  const datePart = withTime ?? dateOnly;
  if (datePart) {
    const m = monthNumber(datePart[1]);
    if (m) month = m;
    day = Number(datePart[2]);
    if (datePart[3]) year = Number(datePart[3]);
  }
  if (year == null || month == null || day == null) return null;

  if (withTime) {
    const clock = parseClock(Number(withTime[4]), Number(withTime[5]), withTime[6]);
    if (clock) {
      hour = clock.hour;
      minute = clock.minute;
      timeUnknown = false;
    }
  } else if (showStarts) {
    const sm = showStarts.match(/^(\d{1,2}):(\d{2})\s*([ap])\.?m/i);
    if (sm) {
      const clock = parseClock(Number(sm[1]), Number(sm[2]), sm[3]);
      if (clock) {
        hour = clock.hour;
        minute = clock.minute;
        timeUnknown = false;
      }
    }
  }

  const starts = detroitWallToUtc(
    year,
    month,
    day,
    timeUnknown ? 0 : hour,
    timeUnknown ? 0 : minute,
    0,
  );
  if (Number.isNaN(starts.getTime())) return null;
  if (!withinDays(starts, now, 180)) return null;

  const h1 = stripTags(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "");
  const og = decodeEntities(
    html.match(
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    )?.[1] ?? "",
  );
  let title = h1 || og.replace(/\s+[–-]\s+The Ark\s*$/i, "").trim();
  if (!title) return null;
  if (looksLikeLowValueListing(title)) return null;

  const venue = stripTags(
    html.match(/tribe-venue[^>]*>([\s\S]*?)<\//i)?.[1] ?? "",
  );
  const place = venue || "The Ark";
  const url = pageUrl.replace(/\/?$/, "/");

  const item: EventItem = {
    id: stableEventId(source.id, url),
    title,
    starts_at: starts.toISOString(),
    place,
    url,
    source_id: source.id,
  };
  if (timeUnknown) item.time_unknown = true;
  return item;
}

/**
 * UMS /season/ listing. Printed weekday + date only — no invented clock.
 */
export function extractUmsListingEvents(
  html: string,
  source: Source,
  now = new Date(),
): EventItem[] {
  const blocks = html.split(/class="event_block\b/i).slice(1);
  const out: EventItem[] = [];
  const seen = new Set<string>();
  const dateRe = new RegExp(
    `(?:${WEEKDAYS}),\\s+([A-Za-z]+)\\s+(\\d{1,2}),\\s+(\\d{4})`,
    "i",
  );

  for (const block of blocks) {
    const href =
      block.match(/href="(https:\/\/ums\.org\/performance\/[^"]+)"/i)?.[1] ??
      "";
    if (!href) continue;
    const title = stripTags(
      block.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i)?.[1] ?? "",
    );
    if (!title) continue;
    const dateM = block.match(dateRe);
    if (!dateM) continue;
    const month = monthNumber(dateM[1]);
    if (!month) continue;
    const day = Number(dateM[2]);
    const year = Number(dateM[3]);
    const starts = detroitWallToUtc(year, month, day, 0, 0, 0);
    if (Number.isNaN(starts.getTime())) continue;
    if (!withinDays(starts, now, 200)) continue;
    if (looksLikeLowValueListing(title)) continue;

    const pills = [...block.matchAll(/class="pill_cat"[^>]*>([\s\S]*?)<\//gi)]
      .map((m) => stripTags(m[1]))
      .filter(Boolean);
    const venuePill = pills.find((p) => UMS_VENUE_HINT.test(p));
    const place = venuePill || "UMS";
    const url = href.replace(/\/?$/, "/");
    const uid = `${url}|${starts.toISOString().slice(0, 10)}`;
    if (seen.has(uid)) continue;
    seen.add(uid);

    out.push({
      id: stableEventId(source.id, uid),
      title,
      starts_at: starts.toISOString(),
      place,
      url,
      source_id: source.id,
      time_unknown: true,
    });
  }

  return out.sort(
    (a, b) =>
      new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
}

async function fetchText(
  url: string,
): Promise<{ ok: boolean; status: number; text: string; blocked: boolean }> {
  const res = await fetch(url, {
    headers: fetchHeaders(),
    redirect: "follow",
  });
  const text = await res.text();
  const blocked =
    res.status === 401 ||
    res.status === 403 ||
    res.status === 429 ||
    /access denied|akamai|forbidden/i.test(text.slice(0, 500));
  return { ok: res.ok, status: res.status, text, blocked };
}

async function pullArkEvents(
  source: Source,
  listHtml: string,
  now: Date,
): Promise<EventItem[]> {
  const links = new Set(collectArkEventLinks(listHtml));
  const pages = collectArkListPages(listHtml).slice(0, 3);
  for (const pageUrl of pages) {
    try {
      const page = await fetchText(pageUrl);
      if (page.ok) {
        for (const link of collectArkEventLinks(page.text)) links.add(link);
      }
    } catch {
      // listing page 2/3 is optional
    }
  }
  try {
    const rss = await fetchText("https://theark.org/events/feed/");
    if (rss.ok) {
      for (const link of collectArkEventLinks(rss.text)) links.add(link);
    }
  } catch {
    // RSS is extra links only — listing is enough
  }

  const urls = [...links].slice(0, 40);
  const out: EventItem[] = [];
  const chunkSize = 5;
  for (let i = 0; i < urls.length; i += chunkSize) {
    const chunk = urls.slice(i, i + chunkSize);
    const settled = await Promise.all(
      chunk.map(async (url) => {
        try {
          const page = await fetchText(url);
          if (!page.ok) return null;
          return extractArkEventFromPage(page.text, url, source, now);
        } catch {
          return null;
        }
      }),
    );
    for (const item of settled) {
      if (item) out.push(item);
    }
  }
  return out.sort(
    (a, b) =>
      new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
}

const AADL_HORIZON_DAYS = 16;
const WASHTENAW_CIVICCLERK_API =
  "https://washtenawcomi.api.civicclerk.com/v1/Events";
const WASHTENAW_CIVICCLERK_PORTAL =
  "https://washtenawcomi.portal.civicclerk.com";

const AADL_WHEN =
  new RegExp(
    `(?:${WEEKDAYS})\\s+([A-Za-z]+)\\s+(\\d{1,2}),\\s+(\\d{4})` +
      `(?::\\s*(\\d{1,2}):(\\d{2})\\s*([ap])\\.?m\\.?)?`,
    "i",
  );

/**
 * AADL Drupal upcoming feed cards. Printed weekday + clock + branch only.
 * Never invent a time — date without a clock → time_unknown.
 */
export function extractAadlEvents(
  html: string,
  source: Source,
  now = new Date(),
): EventItem[] {
  const blocks = [
    ...html.matchAll(
      /<h2 class="no-margin">\s*<a href="(\/node\/\d+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h2>\s*<p>([\s\S]*?)(?:<\/p>|(?=<div class="views-row)|(?=<h2 class="no-margin">))/gi,
    ),
  ];
  if (blocks.length === 0) return [];
  const out: EventItem[] = [];
  const seen = new Set<string>();

  for (const block of blocks) {
    const href = decodeEntities(block[1] ?? "");
    const title = stripTags(block[2] ?? "");
    if (!href || !title) continue;
    const para = block[3] ?? "";
    const whenText = stripTags(para.split(/<br\s*\/?>/i)[0] ?? para);
    const when = whenText.match(AADL_WHEN);
    if (!when) continue;
    const month = monthNumber(when[1]);
    if (!month) continue;
    const year = Number(when[3]);
    const day = Number(when[2]);
    let starts: Date;
    let timeUnknown = false;
    if (when[4] && when[5] && when[6]) {
      const clock = parseClock(Number(when[4]), Number(when[5]), when[6]);
      if (!clock) continue;
      starts = detroitWallToUtc(year, month, day, clock.hour, clock.minute, 0);
    } else {
      starts = detroitWallToUtc(year, month, day, 0, 0, 0);
      timeUnknown = true;
    }
    if (Number.isNaN(starts.getTime())) continue;
    if (!withinDays(starts, now, AADL_HORIZON_DAYS)) continue;

    const afterBr = para.split(/<br\s*\/?>/i)[1] ?? "";
    const placeLine = stripTags(afterBr)
      .replace(/\b(?:Age|Ages|Grade|Grades)\b[\s\S]*$/i, "")
      .replace(/\s+/g, " ")
      .trim();
    const place = placeLine || "Ann Arbor District Library";
    const url = `https://aadl.org${href}`;
    if (seen.has(url)) continue;
    seen.add(url);

    const item: EventItem = {
      id: stableEventId(source.id, url),
      title,
      starts_at: starts.toISOString(),
      place,
      url,
      source_id: source.id,
    };
    if (timeUnknown) item.time_unknown = true;
    out.push(item);
  }

  return out.sort(
    (a, b) =>
      new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
}

type CivicClerkMeeting = {
  id?: number;
  eventName?: string;
  startDateTime?: string;
  eventDate?: string;
  isDeleted?: boolean;
  isArchived?: boolean;
  eventLocation?: { address1?: string | null; city?: string | null } | null;
};

/**
 * Washtenaw CivicClerk OData /Events. Printed startDateTime only.
 * Skip cancelled / deleted rows. Never invent a clock or place street.
 */
export function extractCivicClerkMeetings(
  payload: { value?: CivicClerkMeeting[] } | CivicClerkMeeting[],
  source: Source,
  now = new Date(),
): EventItem[] {
  const rows = Array.isArray(payload) ? payload : (payload.value ?? []);
  const out: EventItem[] = [];
  const seen = new Set<string>();
  const horizon = now.getTime() + 1000 * 60 * 60 * 24 * 90;

  for (const row of rows) {
    const id = row.id;
    const title = String(row.eventName ?? "").trim();
    if (!id || !title) continue;
    if (row.isDeleted || row.isArchived) continue;
    if (/^(cancelled|canceled)\b/i.test(title)) continue;
    const iso = String(row.startDateTime || row.eventDate || "").trim();
    const starts = new Date(iso);
    if (Number.isNaN(starts.getTime())) continue;
    if (starts.getTime() < now.getTime() - 1000 * 60 * 60 * 12) continue;
    if (starts.getTime() > horizon) continue;
    const uid = String(id);
    if (seen.has(uid)) continue;
    seen.add(uid);
    const loc = row.eventLocation;
    const place =
      [loc?.address1, loc?.city]
        .map((p) => (typeof p === "string" ? p.trim() : ""))
        .filter(Boolean)
        .join(", ") || "Washtenaw County";
    out.push({
      id: stableEventId(source.id, uid),
      title,
      starts_at: starts.toISOString(),
      place,
      url: `${WASHTENAW_CIVICCLERK_PORTAL}/event/${id}`,
      source_id: source.id,
    });
  }

  return out.sort(
    (a, b) =>
      new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
}

async function fetchJson(
  url: string,
): Promise<{ ok: boolean; status: number; data: unknown; blocked: boolean }> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": `Mozilla/5.0 (compatible; ${getSite().userAgent})`,
      Accept: "application/json",
    },
    redirect: "follow",
  });
  const blocked = res.status === 401 || res.status === 403 || res.status === 429;
  if (!res.ok) {
    return { ok: false, status: res.status, data: null, blocked };
  }
  try {
    return { ok: true, status: res.status, data: await res.json(), blocked };
  } catch {
    return { ok: false, status: res.status, data: null, blocked };
  }
}

async function pullWashtenawCivicClerk(
  source: Source,
  now: Date,
): Promise<HtmlEventsPullResult> {
  const since = new Date(now.getTime() - 1000 * 60 * 60 * 12).toISOString();
  const first = new URL(WASHTENAW_CIVICCLERK_API);
  first.searchParams.set("$filter", `startDateTime ge ${since}`);
  first.searchParams.set("$orderby", "startDateTime");
  first.searchParams.set("$top", "50");
  const events: EventItem[] = [];
  const seen = new Set<string>();
  let next: string | null = first.toString();
  let status: number | null = null;
  for (let page = 0; page < 4 && next; page++) {
    const res = await fetchJson(next);
    status = res.status;
    if (res.blocked) {
      return { events: [], bot_blocked: true, status: res.status };
    }
    if (!res.ok || !res.data || typeof res.data !== "object") {
      throw new Error(
        `Washtenaw CivicClerk fetch failed ${res.status} for ${source.name}`,
      );
    }
    const batch = extractCivicClerkMeetings(
      res.data as { value?: CivicClerkMeeting[] },
      source,
      now,
    );
    for (const item of batch) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      events.push(item);
    }
    const nextLink =
      typeof (res.data as { "@odata.nextLink"?: unknown })["@odata.nextLink"] ===
      "string"
        ? (res.data as { "@odata.nextLink": string })["@odata.nextLink"]
        : null;
    next = nextLink && batch.length > 0 ? nextLink : null;
  }
  events.sort(
    (a, b) =>
      new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
  return { events, bot_blocked: false, status };
}

async function pullAadlEvents(
  source: Source,
  firstHtml: string,
  now: Date,
): Promise<EventItem[]> {
  const byUrl = new Map<string, EventItem>();
  for (const item of extractAadlEvents(firstHtml, source, now)) {
    if (item.url) byUrl.set(item.url, item);
  }
  const base = source.feed_url || "https://aadl.org/events-feed/upcoming";
  for (let page = 1; page <= 4; page++) {
    const url = `${base}${base.includes("?") ? "&" : "?"}page=${page}`;
    try {
      const next = await fetchText(url);
      if (!next.ok) break;
      const batch = extractAadlEvents(next.text, source, now);
      if (batch.length === 0) break;
      for (const item of batch) {
        if (item.url) byUrl.set(item.url, item);
      }
      const last = batch[batch.length - 1];
      if (
        last &&
        new Date(last.starts_at).getTime() >
          now.getTime() + 1000 * 60 * 60 * 24 * AADL_HORIZON_DAYS
      ) {
        break;
      }
    } catch {
      break;
    }
  }
  return [...byUrl.values()].sort(
    (a, b) =>
      new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
}

/**
 * Worker-reachable AA listings: City Legistar, The Ark tribe pages, UMS season,
 * AADL upcoming feed, Washtenaw CivicClerk OData.
 * Do not invent meetings, showtimes, or clocks.
 */
export async function pullAnnArborHtml(
  source: Source,
): Promise<HtmlEventsPullResult> {
  if (!source.feed_url) {
    return { events: [], bot_blocked: false, status: null };
  }
  if (source.id === "src_washtenaw_calendar") {
    return pullWashtenawCivicClerk(source, new Date());
  }
  const page = await fetchText(source.feed_url);
  if (page.blocked) {
    return { events: [], bot_blocked: true, status: page.status };
  }
  if (!page.ok) {
    throw new Error(`AA listing fetch failed ${page.status} for ${source.name}`);
  }

  const now = new Date();
  let events: EventItem[] = [];
  if (source.id === "src_a2_legistar") {
    events = extractLegistarMeetings(page.text, source, now);
  } else if (source.id === "src_ark_events") {
    events = await pullArkEvents(source, page.text, now);
  } else if (source.id === "src_ums_events") {
    events = extractUmsListingEvents(page.text, source, now);
  } else if (source.id === "src_marquee_events") {
    events = extractMarqueeLiveEvents(page.text, source, now);
  } else if (source.id === "src_aadl_events") {
    events = await pullAadlEvents(source, page.text, now);
  }

  return { events, bot_blocked: false, status: page.status };
}

export type MarqueeSlide = {
  title: string;
  desc: string;
  url: string;
};

export function extractMarqueeSlides(html: string): MarqueeSlide[] {
  const blocks = html.match(
    /<li class="splide__slide now-showing-item">([\s\S]*?)<\/li>/gi,
  );
  if (!blocks) return [];
  const out: MarqueeSlide[] = [];
  const seen = new Set<string>();
  for (const block of blocks) {
    const title = stripTags(
      block.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i)?.[1] ?? "",
    );
    if (!title) continue;
    const desc = stripTags(
      (block.match(/event-archive-desc[^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? "")
        .replace(/<br\s*\/?>/gi, " | "),
    );
    const href = decodeEntities(
      block.match(/href="([^"]+)"/i)?.[1] ?? "",
    );
    const url = href
      ? href.startsWith("http")
        ? href
        : `https://marquee-arts.org${href}`
      : "https://marquee-arts.org/";
    const key = `${title}|${desc}|${url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ title, desc, url });
  }
  return out;
}

type MarqueeWhen = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: string | null;
};

function detroitYear(now: Date): number {
  return Number(detroitDayKey(now).slice(0, 4));
}

function inferYear(month: number, day: number, explicit: number | null, now: Date): number {
  if (explicit && explicit >= 2020 && explicit <= 2035) return explicit;
  const y = detroitYear(now);
  const candidate = detroitWallToUtc(y, month, day, 12, 0, 0);
  if (candidate.getTime() < now.getTime() - 1000 * 60 * 60 * 24 * 2) {
    return y + 1;
  }
  return y;
}

function parseMarqueeWhens(desc: string, now: Date): MarqueeWhen[] {
  const out: MarqueeWhen[] = [];
  const single = new RegExp(
    `(?:(${WEEKDAYS}),\\s+)?([A-Za-z]+)\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,\\s*(\\d{4}))?\\s+at\\s+(\\d{1,2})(?::(\\d{2}))?\\s*([ap])\\.?m`,
    "gi",
  );
  for (const m of desc.matchAll(single)) {
    const month = monthNumber(m[2]);
    if (!month) continue;
    const day = Number(m[3]);
    const clock = parseClock(Number(m[5]), m[6] ? Number(m[6]) : 0, m[7]);
    if (!clock) continue;
    out.push({
      year: inferYear(month, day, m[4] ? Number(m[4]) : null, now),
      month,
      day,
      hour: clock.hour,
      minute: clock.minute,
      weekday: m[1] || null,
    });
  }
  if (out.length > 0) return out;

  const pair = desc.match(
    /([A-Za-z]+)\s+(\d{1,2})\s*&\s*(\d{1,2})(?:st|nd|rd|th)?\s+at\s+(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m/i,
  );
  if (pair) {
    const month = monthNumber(pair[1]);
    const clock = parseClock(Number(pair[4]), pair[5] ? Number(pair[5]) : 0, pair[6]);
    if (month && clock) {
      for (const day of [Number(pair[2]), Number(pair[3])]) {
        out.push({
          year: inferYear(month, day, null, now),
          month,
          day,
          hour: clock.hour,
          minute: clock.minute,
          weekday: null,
        });
      }
    }
  }
  return out;
}

function marqueeHall(desc: string): string {
  if (/\bscreening room\b/i.test(desc)) return "Michigan Theater Screening Room";
  if (/\bstate\b/i.test(desc) && !/\bunited states\b/i.test(desc)) {
    return "State Theatre";
  }
  if (/\bmain auditorium\b/i.test(desc) || /\bmichigan theater\b/i.test(desc)) {
    return "Michigan Theater";
  }
  if (/\bmichigan\b/i.test(desc)) return "Michigan Theater";
  return "Marquee Arts";
}

function formatMarqueeClock(hour: number, minute: number): string {
  const suffix = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function isMarqueeFilm(desc: string): boolean {
  return /\|\s*Film\s*\|/i.test(desc) || /\bFilm\s*\|/i.test(desc);
}

/**
 * Marquee homepage live events (concerts, ballet, comedy, lectures).
 * Printed date + clock only. Films stay on /shows.
 */
export function extractMarqueeLiveEvents(
  html: string,
  source: Source,
  now = new Date(),
): EventItem[] {
  const out: EventItem[] = [];
  const seen = new Set<string>();
  for (const slide of extractMarqueeSlides(html)) {
    if (isMarqueeFilm(slide.desc)) continue;
    if (/blood drive/i.test(slide.title) || looksLikeLowValueListing(slide.title)) {
      continue;
    }
    if (/^now playing\b/i.test(slide.desc) || /^opens\b/i.test(slide.desc)) {
      continue;
    }
    const whens = parseMarqueeWhens(slide.desc, now);
    if (whens.length === 0) continue;
    const place = marqueeHall(slide.desc);
    for (const when of whens) {
      const starts = detroitWallToUtc(
        when.year,
        when.month,
        when.day,
        when.hour,
        when.minute,
        0,
      );
      if (Number.isNaN(starts.getTime()) || !withinDays(starts, now, 180)) {
        continue;
      }
      const uid = `${slide.url}|${starts.toISOString()}`;
      if (seen.has(uid)) continue;
      seen.add(uid);
      out.push({
        id: stableEventId(source.id, uid),
        title: slide.title,
        starts_at: starts.toISOString(),
        place,
        url: slide.url,
        source_id: source.id,
      });
    }
  }
  return out.sort(
    (a, b) =>
      new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
}

/**
 * Marquee film cards with a printed clock. "Now Playing" / "Opens Friday"
 * without a time is skipped — never invent a showtime.
 */
export function extractMarqueeShows(
  html: string,
  source: Source,
  now = new Date(),
): ShowListing[] {
  const byTitle = new Map<
    string,
    { starts: Date; ends: Date; times: string[]; url: string; venue: string }
  >();
  for (const slide of extractMarqueeSlides(html)) {
    if (!isMarqueeFilm(slide.desc)) continue;
    if (looksLikeLowValueListing(slide.title)) continue;
    const whens = parseMarqueeWhens(slide.desc, now);
    if (whens.length === 0) continue;
    const venue = marqueeHall(slide.desc);
    for (const when of whens) {
      const starts = detroitWallToUtc(
        when.year,
        when.month,
        when.day,
        when.hour,
        when.minute,
        0,
      );
      if (Number.isNaN(starts.getTime()) || !withinDays(starts, now, 180)) {
        continue;
      }
      const clock = formatMarqueeClock(when.hour, when.minute);
      const label = when.weekday
        ? `${when.weekday.slice(0, 3)} ${clock}`
        : clock;
      const existing = byTitle.get(slide.title);
      if (!existing) {
        byTitle.set(slide.title, {
          starts,
          ends: starts,
          times: [label],
          url: slide.url,
          venue,
        });
        continue;
      }
      if (starts < existing.starts) existing.starts = starts;
      if (starts > existing.ends) existing.ends = starts;
      if (!existing.times.includes(label)) existing.times.push(label);
    }
  }

  return [...byTitle.entries()]
    .map(([title, row]) => {
      const listing: ShowListing = {
        id: stableShowId(source.id, `${title}|${row.starts.toISOString().slice(0, 10)}`),
        title,
        venue: row.venue,
        starts_at: row.starts.toISOString(),
        ends_at:
          row.ends.getTime() === row.starts.getTime()
            ? null
            : row.ends.toISOString(),
        times: row.times,
        url: row.url,
        source_id: source.id,
      };
      return listing;
    })
    .sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    );
}

const SHORT_MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

/**
 * City of Ann Arbor newsroom cards. Headline + permalink + printed date only.
 * Never invent a dek or body.
 */
export function extractA2GovNews(html: string, source: Source): Story[] {
  const blocks = html.match(
    /<li class="gs-feed-list-item[\s\S]*?<\/li>/gi,
  );
  if (!blocks) return [];
  const out: Story[] = [];
  const seen = new Set<string>();
  for (const block of blocks) {
    const href = decodeEntities(
      block.match(/href="(\/news\/posts\/[^"]+)"/i)?.[1] ?? "",
    );
    const title = stripTags(
      block.match(/gs-feed-list-title[^>]*>([\s\S]*?)<\/a>/i)?.[1] ?? "",
    );
    const dateText = stripTags(
      block.match(/gs-feed-list-date[^>]*>([\s\S]*?)<\//i)?.[1] ?? "",
    );
    if (!href || !title) continue;
    const dm = dateText.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),\s+(\d{4})$/);
    if (!dm) continue;
    const month =
      monthNumber(dm[1]) ?? SHORT_MONTHS[dm[1].slice(0, 3).toLowerCase()];
    if (!month) continue;
    const published = detroitWallToUtc(
      Number(dm[3]),
      month,
      Number(dm[2]),
      0,
      0,
      0,
    );
    if (Number.isNaN(published.getTime())) continue;
    const url = `https://www.a2gov.org${href}`;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({
      id: newId("story"),
      source_id: source.id,
      title,
      dek: "",
      url,
      published_at: published.toISOString(),
      is_original: false,
      body: null,
      image_url: null,
      byline: null,
      slug: null,
    });
  }
  return out.sort(
    (a, b) =>
      new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
  );
}

export async function pullAnnArborNews(
  source: Source,
): Promise<{ stories: Story[]; bot_blocked: boolean; status: number | null }> {
  if (!source.feed_url) {
    return { stories: [], bot_blocked: false, status: null };
  }
  const page = await fetchText(source.feed_url);
  if (page.blocked) {
    return { stories: [], bot_blocked: true, status: page.status };
  }
  if (!page.ok) {
    throw new Error(`AA news fetch failed ${page.status} for ${source.name}`);
  }
  return {
    stories: extractA2GovNews(page.text, source),
    bot_blocked: false,
    status: page.status,
  };
}
