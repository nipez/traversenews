import { detroitWallToUtc } from "@/lib/dates";
import { schoolFromSourceId, stableAthleticsId } from "@/lib/athletics";
import { eventLinkFeedUrl } from "@/lib/pull/eventlink-feeds";
import { getSite } from "@/lib/sites";
import type { AthleticsGame, Source } from "@/lib/types";

export {
  EVENTLINK_ATHLETICS_FEEDS,
  EVENTLINK_ATHLETICS_SOURCE_IDS,
  eventLinkFeedUrl,
} from "@/lib/pull/eventlink-feeds";

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const MAX_EVENTLINK_PAGES = 4;
const HORIZON_DAYS = 21;

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();
}

function stripTags(s: string): string {
  return decodeEntities(
    s.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
  );
}

function fetchHeaders(): HeadersInit {
  return {
    "User-Agent": getSite().userAgent,
    Accept: "text/html,application/xhtml+xml",
  };
}

function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

function resolveUrl(href: string, base: string): string | null {
  const h = href.trim();
  if (!h) return null;
  if (/^https?:\/\//i.test(h)) return h;
  try {
    return new URL(h, base).toString();
  } catch {
    return null;
  }
}

export type EventLinkWhen = {
  starts: Date;
  timeUnknown: boolean;
};

/**
 * Printed EventLink when-cell: "Thu, Sep. 3 2026 3:00 PM EDT" or date + TBD.
 * Only America/Detroit clocks (EDT/EST). MDT/PDT rows are a different school.
 * Never invents a kickoff from TBD.
 */
export function parseEventLinkWhen(raw: string): EventLinkWhen | null {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return null;
  const m = text.match(
    /(?:[A-Za-z]{3,9},\s+)?([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*([AaPp][Mm])\s+(EDT|EST|CDT|CST|MDT|MST|PDT|PST))?(?:\s+TBD)?/i,
  );
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  if (!month) return null;
  const day = Number(m[2]);
  const year = Number(m[3]);
  if (!day || !year) return null;

  const tz = m[7]?.toUpperCase() ?? "";
  if (tz && tz !== "EDT" && tz !== "EST") return null;

  if (!m[4] || !m[5] || !m[6]) {
    return {
      starts: detroitWallToUtc(year, month, day, 0, 0, 0),
      timeUnknown: true,
    };
  }

  const hour12 = Number(m[4]);
  const minute = Number(m[5]);
  if (hour12 < 1 || hour12 > 12 || minute > 59) return null;
  const mer = m[6].toLowerCase();
  let hour = hour12 % 12;
  if (mer.startsWith("p")) hour += 12;
  return {
    starts: detroitWallToUtc(year, month, day, hour, minute, 0),
    timeUnknown: false,
  };
}

export function extractEventLinkGames(
  html: string,
  source: Source,
  now = new Date(),
  pageUrl?: string,
): AthleticsGame[] {
  const base = pageUrl || source.feed_url || source.homepage;
  const origin = originOf(base) || originOf(source.homepage);
  const school = schoolFromSourceId(source.id);
  const horizon = now.getTime() + HORIZON_DAYS * 24 * 60 * 60 * 1000;
  const floor = now.getTime() - 12 * 60 * 60 * 1000;
  const byId = new Map<string, AthleticsGame>();

  const rows = html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  for (const row of rows) {
    const cells = [
      ...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi),
    ].map((c) => c[1]);
    if (cells.length < 3) continue;
    const sport = stripTags(cells[0]);
    const opponent = stripTags(cells[1]);
    const whenText = stripTags(cells[2]);
    const place = cells[3] ? stripTags(cells[3]) : "";
    if (!sport || !whenText) continue;
    if (/^calendar$/i.test(sport)) continue;
    if (/\bcanceled:/i.test(`${sport} ${opponent}`)) continue;

    const when = parseEventLinkWhen(whenText);
    if (!when) continue;
    const t = when.starts.getTime();
    if (t < floor || t > horizon) continue;

    const href =
      row.match(/href="(\/Event\/[^"]+)"/i)?.[1] ??
      row.match(/href="(https?:\/\/[^"]+\/Event\/[^"]+)"/i)?.[1] ??
      "";
    const url = resolveUrl(href, origin || base) || base;
    const title = opponent ? `${sport} — ${opponent}` : sport;
    const uid = `${url}|${when.starts.toISOString()}|${title}`;
    const game: AthleticsGame = {
      id: stableAthleticsId(source.id, uid),
      title,
      starts_at: when.starts.toISOString(),
      place: place || school,
      url,
      source_id: source.id,
      school,
    };
    if (when.timeUnknown) game.time_unknown = true;
    byId.set(game.id, game);
  }

  return [...byId.values()].sort(
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
    /access denied|invalid affiliate|invalidsite|forbidden/i.test(
      text.slice(0, 800),
    );
  return { ok: res.ok, status: res.status, text, blocked };
}

export type AthleticsPullResult = {
  games: AthleticsGame[];
  bot_blocked: boolean;
  status: number | null;
  error?: string;
};

function eventsListUrl(feedUrl: string, page: number): string {
  if (page <= 1) return feedUrl;
  const joiner = feedUrl.includes("?") ? "&" : "?";
  return `${feedUrl}${joiner}pageNumber=${page}`;
}

/**
 * Pull EventLink /Events tables. Pagination only — never invents a game.
 * ArbiterLive InvalidSite is treated as blocked (Skyline / Huron / Ypsi stay import).
 */
export async function pullEventLinkAthletics(
  source: Source,
  now = new Date(),
): Promise<AthleticsPullResult> {
  const feedUrl = eventLinkFeedUrl(source);
  if (!feedUrl) {
    return { games: [], bot_blocked: false, status: null };
  }
  const first = await fetchText(eventsListUrl(feedUrl, 1));
  if (first.blocked) {
    return { games: [], bot_blocked: true, status: first.status };
  }
  if (!first.ok) {
    throw new Error(
      `Athletics fetch failed ${first.status} for ${source.name}`,
    );
  }
  const byId = new Map<string, AthleticsGame>();
  for (const g of extractEventLinkGames(first.text, source, now, feedUrl)) {
    byId.set(g.id, g);
  }
  for (let page = 2; page <= MAX_EVENTLINK_PAGES; page++) {
    try {
      const next = await fetchText(eventsListUrl(feedUrl, page));
      if (!next.ok || next.blocked) break;
      const extra = extractEventLinkGames(
        next.text,
        source,
        now,
        eventsListUrl(feedUrl, page),
      );
      if (extra.length === 0) break;
      for (const g of extra) byId.set(g.id, g);
    } catch {
      break;
    }
  }
  return {
    games: [...byId.values()].sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    ),
    bot_blocked: false,
    status: first.status,
  };
}
