import { stableEventId } from "@/lib/events";
import type { EventItem, Source } from "@/lib/types";

const MONTHS: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  sept: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&nbsp;/g, " ")
    .trim();
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

/** Parse "Saturday, August 22, 2026 - 6:30 p.m. ET" into an ISO instant (Detroit-ish). */
export function parseLooseEventWhen(raw: string, now = new Date()): Date | null {
  const text = stripTags(raw);
  const m = text.match(
    /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})(?:\s*[-–]\s*(\d{1,2}):(\d{2})\s*([ap])\.?m\.?)?/i,
  );
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  if (month === undefined) return null;
  const day = Number(m[2]);
  const year = Number(m[3]);
  let hour = 12;
  let minute = 0;
  if (m[4]) {
    hour = Number(m[4]) % 12;
    minute = Number(m[5]);
    if ((m[6] || "a").toLowerCase() === "p") hour += 12;
  }
  // Treat listed local times as America/Detroit by composing a UTC offset guess
  // via Date with explicit parts in local... Workers are UTC, so build as Z and
  // subtract typical EDT (-4) / EST (-5) from the listed wall time.
  const offsetHours = isLikelyEdt(year, month, day) ? 4 : 5;
  const utc = Date.UTC(year, month, day, hour + offsetHours, minute, 0);
  const d = new Date(utc);
  if (Number.isNaN(d.getTime())) return null;
  // Ignore ancient / far-future parse mistakes
  if (Math.abs(d.getTime() - now.getTime()) > 1000 * 60 * 60 * 24 * 400) {
    return null;
  }
  return d;
}

function isLikelyEdt(year: number, month: number, day: number): boolean {
  // Rough US DST window: second Sunday March → first Sunday November.
  const march = new Date(Date.UTC(year, 2, 1));
  const nov = new Date(Date.UTC(year, 10, 1));
  const secondSunMarch =
    1 + ((7 - march.getUTCDay()) % 7) + 7;
  const firstSunNov = 1 + ((7 - nov.getUTCDay()) % 7);
  const n = month * 100 + day;
  return n >= 2 * 100 + secondSunMarch && n < 10 * 100 + firstSunNov;
}

function withinHorizon(d: Date, now: Date): boolean {
  const t = d.getTime();
  return t >= now.getTime() - 1000 * 60 * 60 * 12 && t <= now.getTime() + 1000 * 60 * 60 * 24 * 45;
}

function parseInterlochen(html: string, source: Source, now: Date): EventItem[] {
  const blocks = html.split(/<div class="event__performers">/).slice(1);
  const out: EventItem[] = [];
  for (const block of blocks) {
    const titleM = block.match(
      /event__title[^>]*>\s*<a href="([^"]+)">\s*([\s\S]*?)<\/a>/i,
    );
    if (!titleM) continue;
    const href = titleM[1].trim();
    const title = stripTags(titleM[2]);
    if (!title) continue;
    const logistics = block.match(/event__logistics[\s\S]*?<\/div>/i)?.[0] ?? block;
    const dateText =
      logistics.match(/event__date[^>]*>([\s\S]*?)<\//i)?.[1] ??
      logistics.match(/(\w+day,\s+[A-Za-z]+\s+\d{1,2},?\s+\d{4}[\s\S]{0,40})/i)?.[1] ??
      "";
    const when = parseLooseEventWhen(dateText || titleM[0], now);
    // Fallback: date embedded in slug …-2026-08-25
    let starts = when;
    if (!starts) {
      const slugDate = href.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (slugDate) {
        starts = new Date(
          Date.UTC(
            Number(slugDate[1]),
            Number(slugDate[2]) - 1,
            Number(slugDate[3]),
            23,
            0,
            0,
          ),
        );
      }
    }
    if (!starts || !withinHorizon(starts, now)) continue;
    const url = href.startsWith("http")
      ? href
      : `https://www.interlochen.org${href}`;
    const place =
      stripTags(
        block.match(/event__venue[^>]*>([\s\S]*?)<\//i)?.[1] ??
          block.match(/event__location[^>]*>([\s\S]*?)<\//i)?.[1] ??
          "",
      ) || "Interlochen";
    out.push({
      id: stableEventId(source.id, `${title}|${starts.toISOString()}`),
      title,
      starts_at: starts.toISOString(),
      place,
      url,
      source_id: source.id,
    });
  }
  return out;
}

function parseTadl(html: string, source: Source, now: Date): EventItem[] {
  const articles = html.match(
    /<article[^>]*class="[^"]*event-card[^"]*"[\s\S]*?<\/article>/gi,
  );
  if (!articles) return [];
  const out: EventItem[] = [];
  for (const article of articles) {
    const link =
      article.match(
        /<a\b[^>]*class="[^"]*lc-event__link[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i,
      ) ||
      article.match(
        /<a\b[^>]*href="([^"]+)"[^>]*class="[^"]*lc-event__link[^"]*"[^>]*>([\s\S]*?)<\/a>/i,
      );
    if (!link) continue;
    const href = link[1].trim();
    const title = stripTags(link[2]);
    if (!title) continue;

    const monthRaw =
      article.match(/lc-date-icon__item--month[^>]*>([\s\S]*?)<\//i)?.[1] ?? "";
    const dayRaw =
      article.match(/lc-date-icon__item--day[^>]*>([\s\S]*?)<\//i)?.[1] ?? "";
    const yearRaw =
      article.match(/lc-date-icon__item--year[^>]*>([\s\S]*?)<\//i)?.[1] ?? "";
    const monthToken = stripTags(monthRaw).toLowerCase().split(/[^a-z]+/)[0];
    const month = MONTHS[monthToken];
    const day = Number(stripTags(dayRaw));
    const year =
      Number(stripTags(yearRaw)) ||
      now.getFullYear();
    if (month === undefined || !Number.isFinite(day) || day < 1) continue;

    const starts = new Date(Date.UTC(year, month, day, 16, 0, 0));
    if (!withinHorizon(starts, now)) continue;
    const place =
      stripTags(
        article.match(/lc-event__location[^>]*>([\s\S]*?)<\//i)?.[1] ??
          article.match(/lc-event__branch[^>]*>([\s\S]*?)<\//i)?.[1] ??
          "",
      ) || "TADL";
    const url = href.startsWith("http") ? href : `https://www.tadl.org${href}`;
    out.push({
      id: stableEventId(source.id, `${title}|${starts.toISOString()}`),
      title,
      starts_at: starts.toISOString(),
      place,
      url,
      source_id: source.id,
    });
  }
  return out;
}

/**
 * Best-effort HTML event pull for desks that do not expose ICS.
 * Visit TC (Simpleview) is often bot-blocked from datacenter IPs — empty is OK.
 */
export async function pullHtmlEvents(source: Source): Promise<EventItem[]> {
  if (!source.feed_url) return [];
  const res = await fetch(source.feed_url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; traverse.news-puller/1.0; +https://traverse.news)",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });
  if (!res.ok) {
    // Bot walls (Visit TC / Simpleview) — empty is correct; do not invent events.
    if (res.status === 403 || res.status === 401 || res.status === 429) {
      return [];
    }
    throw new Error(`HTML event fetch failed ${res.status} for ${source.name}`);
  }
  const html = await res.text();
  if (/access denied|akamai|forbidden/i.test(html.slice(0, 500))) {
    return [];
  }
  const now = new Date();
  const host = (() => {
    try {
      return new URL(source.feed_url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();

  if (host.includes("interlochen.org") || source.id === "src_interlochen") {
    return parseInterlochen(html, source, now);
  }
  if (host.includes("tadl.org") || source.id === "src_tadl") {
    return parseTadl(html, source, now);
  }
  return [];
}
