import { detroitWallToUtc } from "@/lib/dates";
import { getSite } from "@/lib/sites";
import {
  stableShowId,
  venueNameForSource,
  type ShowImportRow,
} from "@/lib/shows";
import type { ShowListing, Source } from "@/lib/types";

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
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
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
    s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
  );
}

function htmlToText(html: string): string {
  let s = html.replace(/<script[\s\S]*?<\/script>/gi, " ");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, " ");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<\/(p|div|h[1-6]|li|tr|td)>/gi, "\n");
  s = s.replace(/<[^>]+>/g, " ");
  return decodeEntities(s)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatClock(hour24: number, minute: number): string {
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const h12 = hour24 % 12 || 12;
  if (minute === 0) return `${h12}:00 ${suffix}`;
  return `${h12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

/** Parse clocks like "1pm", "7:00 pm", "1:00pm" — never invent when absent. */
export function parseStatedClocks(raw: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const re = /(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s*m\.?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    let hour = Number(m[1]) % 12;
    const minute = m[2] ? Number(m[2]) : 0;
    if (m[3].toLowerCase() === "p") hour += 12;
    if (m[3].toLowerCase() === "a" && Number(m[1]) === 12) hour = 0;
    const label = formatClock(hour, minute);
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

type ParsedDay = { year: number; month: number; day: number };

function parseMonthDayYear(
  monthName: string,
  day: string,
  year: string,
): ParsedDay | null {
  const month = MONTHS[monthName.toLowerCase()];
  if (month === undefined) return null;
  const d = Number(day);
  const y = Number(year);
  if (!d || !y) return null;
  return { year: y, month, day: d };
}

function dayToMidnightIso(d: ParsedDay): string {
  return detroitWallToUtc(d.year, d.month + 1, d.day, 0, 0, 0).toISOString();
}

function withinHorizon(iso: string, now: Date, days = 120): boolean {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return (
    t >= now.getTime() - 1000 * 60 * 60 * 24 * 2 &&
    t <= now.getTime() + 1000 * 60 * 60 * 24 * days
  );
}

function listingFromParts(args: {
  source: Source;
  title: string;
  startsIso: string;
  endsIso?: string | null;
  times: string[];
  url?: string | null;
}): ShowListing {
  const venue = venueNameForSource(args.source.id);
  const uid = `${args.title.toLowerCase()}|${args.startsIso.slice(0, 10)}`;
  const row: ShowListing = {
    id: stableShowId(args.source.id, uid),
    title: args.title,
    venue,
    starts_at: args.startsIso,
    ends_at: args.endsIso ?? null,
    times: args.times,
    url: args.url ?? args.source.homepage,
    source_id: args.source.id,
  };
  if (args.times.length === 0) row.time_unknown = true;
  return row;
}

/**
 * State Theatre / Bijou homepage — NOW PLAYING (+ light COMING SOON).
 * Only emits titles and clocks found on the page. RSS feed has no showtimes.
 */
export function parseStateTheatreHtml(
  html: string,
  source: Source,
  now = new Date(),
): ShowListing[] {
  const text = htmlToText(html);
  const nowIdx = text.search(/NOW PLAYING:?/i);
  if (nowIdx < 0) return [];

  let section = text.slice(nowIdx);
  const comingIdx = section.search(/\nCOMING SOON:?/i);
  const nowPlaying =
    comingIdx >= 0 ? section.slice(0, comingIdx) : section.slice(0, 4000);
  const comingSoon =
    comingIdx >= 0 ? section.slice(comingIdx, comingIdx + 3500) : "";

  const out: ShowListing[] = [];

  // Film block: TITLE then weekday lines with clocks.
  // Example: "TONY" / "Friday, August 28th – 7:00 pm"
  const filmChunks = nowPlaying.split(
    /\n(?=[A-Z][A-Z0-9'’&:!\- ]{2,60}\n)/,
  );
  for (const chunk of filmChunks) {
    const lines = chunk
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) continue;
    const titleLine = lines[0];
    if (/^NOW PLAYING/i.test(titleLine)) continue;
    if (/^(TICKETS|TRAILER|COMING SOON)/i.test(titleLine)) continue;
    if (titleLine.length > 80) continue;
    // Skip prose blurbs mistaken for titles.
    if (/\b(travels|directed|starring|join us)\b/i.test(titleLine)) continue;

    const dayLines = lines.filter((l) =>
      /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i.test(l),
    );
    const clocks: string[] = [];
    let firstDay: ParsedDay | null = null;
    let lastDay: ParsedDay | null = null;
    const yearGuess = now.getFullYear();

    for (const line of dayLines) {
      const dm = line.match(
        /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?/i,
      );
      if (!dm) continue;
      const year = dm[4] ? Number(dm[4]) : yearGuess;
      const day = parseMonthDayYear(dm[2], dm[3], String(year));
      if (!day) continue;
      if (!firstDay) firstDay = day;
      lastDay = day;
      const lineClocks = parseStatedClocks(line);
      for (const c of lineClocks) {
        // Keep day + clock as stated when the page lists per-day grids.
        const label = `${dm[1].slice(0, 3)} ${c}`;
        if (!clocks.includes(label)) clocks.push(label);
      }
    }

    // Range line without clocks: "Friday, August 28th – Sunday, August 30th"
    if (!firstDay) {
      const range = chunk.match(
        /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\s*[–-]\s*(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?/i,
      );
      if (range) {
        const y1 = range[4] ? Number(range[4]) : yearGuess;
        const y2 = range[7] ? Number(range[7]) : y1;
        firstDay = parseMonthDayYear(range[2], range[3], String(y1));
        lastDay = parseMonthDayYear(range[5], range[6], String(y2));
      }
    }

    if (!firstDay) continue;
    const startsIso = dayToMidnightIso(firstDay);
    if (!withinHorizon(startsIso, now)) continue;
    const endsIso = lastDay ? dayToMidnightIso(lastDay) : null;
    out.push(
      listingFromParts({
        source,
        title: titleLine,
        startsIso,
        endsIso,
        times: clocks,
        url: source.homepage,
      }),
    );
  }

  // Coming soon live events with an explicit date + optional clocks.
  if (comingSoon) {
    const lines = comingSoon
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
      const dateLine = lines[i];
      if (
        !/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+[A-Za-z]+\s+\d{1,2}/i.test(
          dateLine,
        )
      ) {
        continue;
      }
      const dm = dateLine.match(
        /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i,
      );
      if (!dm) continue;
      const day = parseMonthDayYear(dm[1], dm[2], dm[3]);
      if (!day) continue;
      const startsIso = dayToMidnightIso(day);
      if (!withinHorizon(startsIso, now)) continue;

      // Walk upward for the event title (skip blurbs / tickets / coming soon).
      let title = "";
      for (let j = i - 1; j >= 0 && j >= i - 6; j--) {
        const cand = lines[j];
        if (/^COMING SOON/i.test(cand)) break;
        if (/^(TICKETS|TRAILER)$/i.test(cand)) continue;
        if (
          /^(Join us|Laugh the|What started|Tickets are|An All-Ages)/i.test(
            cand,
          )
        ) {
          continue;
        }
        if (
          /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i.test(
            cand,
          )
        ) {
          continue;
        }
        if (cand.length < 3 || cand.length > 80) continue;
        // Prefer ALL-CAPS / short shout titles when present.
        if (/^[A-Z0-9][A-Z0-9'’:&!\- ]{2,}$/.test(cand) || /!$/.test(cand)) {
          title = cand;
          break;
        }
        if (!title) title = cand;
      }
      if (!title) continue;

      const showtimeLine = lines
        .slice(i, i + 5)
        .find((l) => /showtime/i.test(l));
      const times = showtimeLine
        ? parseStatedClocks(showtimeLine)
        : parseStatedClocks(dateLine);

      out.push(
        listingFromParts({
          source,
          title,
          startsIso,
          times,
          url: source.homepage,
        }),
      );
    }
  }

  return out;
}

/**
 * Elk Rapids Cinema Weebly homepage — Now Playing blocks with Showtimes.
 * One row per title; times only when the Showtimes line states them.
 */
export function parseElkRapidsCinemaHtml(
  html: string,
  source: Source,
  now = new Date(),
): ShowListing[] {
  // Work from paragraph blocks that carry the movie card.
  const paragraphs = html.match(/<div class="paragraph"[\s\S]*?<\/div>/gi) ?? [];
  const out: ShowListing[] = [];
  const yearGuess = now.getFullYear();

  for (const para of paragraphs) {
    const text = stripTags(para);
    if (!/\bShowtimes\b/i.test(text) && !/\bStarts:\b/i.test(text)) continue;

    const titleM = text.match(
      /^(.+?)\s*(?:\((\d{4})\))?\s+Starts:\s*/i,
    );
    if (!titleM) continue;
    let title = titleM[1].replace(/\s+/g, " ").trim();
    // Drop leading junk / empty.
    title = title.replace(/^[\s\u200b]+/, "");
    if (!title || title.length > 120) continue;
    if (/^Approx\./i.test(title)) continue;

    const yearInTitle = titleM[2] ? Number(titleM[2]) : null;
    if (yearInTitle) {
      // Keep year in title only if the source printed it in the strong name.
      // titleM already consumed "(2026)" — restore if it was part of the name.
      const rawTitle = stripTags(para).match(
        /^(?:.*?)([A-Za-z0-9].+?\(\d{4}\))/,
      );
      if (rawTitle) {
        title = rawTitle[1].replace(/\s+/g, " ").trim();
      }
    }

    // Prefer the strong-tagged title when present.
    const strongTitle = para.match(
      /<strong>(?:<span>)?([^<]+?)(?:<\/span>)?<\/strong>\s*(?:<br|$)/i,
    );
    if (strongTitle) {
      const t = stripTags(strongTitle[1]);
      if (t && t.length < 120 && !/^Starts:/i.test(t) && !/^Director:/i.test(t)) {
        title = t;
      }
    }

    const startsM = text.match(
      /Starts:\s*(?:Friday|Saturday|Sunday|Monday|Tuesday|Wednesday|Thursday)?,?\s*([A-Za-z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?/i,
    );
    if (!startsM) continue;
    const startYear = startsM[3]
      ? Number(startsM[3])
      : yearInTitle ?? yearGuess;
    const firstDay = parseMonthDayYear(startsM[1], startsM[2], String(startYear));
    if (!firstDay) continue;

    let lastDay: ParsedDay | null = null;
    const runsM = text.match(
      /Runs(?:\s+weekends)?\s+through\s+(?:Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)?,?\s*([A-Za-z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?/i,
    );
    if (runsM) {
      const endYear = runsM[3] ? Number(runsM[3]) : firstDay.year;
      lastDay = parseMonthDayYear(runsM[1], runsM[2], String(endYear));
    }

    // Showtimes date span may also name end dates.
    const showRange = text.match(
      /Showtimes\s+([A-Za-z]+)\s+(\d{1,2})\s*[–\-]\s*(?:(\d{1,2})\s*&?\s*)?(?:([A-Za-z]+)\s+)?(\d{1,2})(?:,?\s+(\d{4}))?/i,
    );
    if (showRange && !lastDay) {
      const endMonth = showRange[4] || showRange[1];
      const endDay = showRange[5];
      const endYear = showRange[6] ? Number(showRange[6]) : firstDay.year;
      lastDay = parseMonthDayYear(endMonth, endDay, String(endYear));
    }

    const afterShowtimes = text.split(/Showtimes/i)[1] ?? "";
    const times = parseStatedClocks(afterShowtimes);
    const startsIso = dayToMidnightIso(firstDay);
    if (!withinHorizon(startsIso, now)) continue;

    out.push(
      listingFromParts({
        source,
        title,
        startsIso,
        endsIso: lastDay ? dayToMidnightIso(lastDay) : null,
        times,
        url: source.homepage,
      }),
    );
  }

  return out;
}

/**
 * The Alluvion Squarespace /tickets list — eventlist-event articles with
 * datetime + title + optional start clock in static HTML (verified live).
 * One row per dated listing; never invent clocks; skip past dates.
 */
export function parseAlluvionHtml(
  html: string,
  source: Source,
  now = new Date(),
): ShowListing[] {
  const chunks = html.split(/(?=<article\b[^>]*\beventlist-event\b)/i);
  const out: ShowListing[] = [];
  const seen = new Set<string>();
  const origin = "https://www.thealluvion.org";

  for (const chunk of chunks) {
    if (!/<article\b[^>]*\beventlist-event\b/i.test(chunk.slice(0, 200))) {
      continue;
    }
    // Prefer the article body only (stop before the next article if present).
    const end = chunk.search(/<\/article>/i);
    const block = end >= 0 ? chunk.slice(0, end) : chunk.slice(0, 12_000);
    if (/\beventlist-event--past\b/i.test(block.slice(0, 280))) continue;

    const titleM = block.match(
      /class="[^"]*eventlist-title-link[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i,
    ) || block.match(
      /href="([^"]+)"[^>]*class="[^"]*eventlist-title-link[^"]*"[^>]*>([\s\S]*?)<\/a>/i,
    );
    if (!titleM) continue;
    const title = stripTags(titleM[2]);
    if (!title || title.length > 200) continue;

    const dateM = block.match(
      /<time\b[^>]*class="[^"]*\bevent-date\b[^"]*"[^>]*datetime="(\d{4}-\d{2}-\d{2})"/i,
    ) || block.match(
      /<time\b[^>]*datetime="(\d{4}-\d{2}-\d{2})"[^>]*class="[^"]*\bevent-date\b[^"]*"/i,
    );
    if (!dateM) continue;
    const [y, mo, d] = dateM[1].split("-").map(Number);
    if (!y || !mo || !d) continue;
    const startsIso = dayToMidnightIso({ year: y, month: mo - 1, day: d });
    if (!withinHorizon(startsIso, now)) continue;

    // Start clock only — never invent; end times stay out of times[].
    const startClockHtml =
      block.match(
        /<time\b[^>]*class="[^"]*event-time-localized-start[^"]*"[^>]*>([\s\S]*?)<\/time>/i,
      )?.[1] ?? "";
    const times = parseStatedClocks(stripTags(startClockHtml));

    let href = decodeEntities(titleM[1].trim());
    if (href.startsWith("/")) href = `${origin}${href}`;
    else if (!/^https?:\/\//i.test(href)) href = `${origin}/${href}`;
    // Drop calendar export query junk.
    href = href.replace(/\?format=ical.*$/i, "").replace(/#.*$/, "");

    const key = `${title.toLowerCase()}|${dateM[1]}|${times[0] ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push(
      listingFromParts({
        source,
        title,
        startsIso,
        times,
        url: href || source.homepage,
      }),
    );
  }

  return out;
}

export type HtmlShowsPullResult = {
  shows: ShowListing[];
  bot_blocked: boolean;
  status: number | null;
  error: string | null;
};

const BOT_STATUS = new Set([401, 403, 429, 503]);

/**
 * Worker HTML pull for Shows venues that publish showtimes in static HTML.
 * Bot-blocked / JS-only venues must use Desk /api/desk/shows/import instead.
 */
export async function pullHtmlShows(
  source: Source,
): Promise<HtmlShowsPullResult> {
  const url = source.feed_url || source.homepage;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          `Mozilla/5.0 (compatible; ${getSite().userAgent})`,
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    const status = res.status;
    if (BOT_STATUS.has(status)) {
      return {
        shows: [],
        bot_blocked: true,
        status,
        error: `HTTP ${status} fetching ${url}`,
      };
    }
    if (!res.ok) {
      return {
        shows: [],
        bot_blocked: false,
        status,
        error: `HTTP ${status} fetching ${url}`,
      };
    }
    const html = await res.text();
    // Cloudflare / Akamai interstitial.
    if (
      /attention required|cf-browser-verification|access denied due to malicious/i.test(
        html,
      )
    ) {
      return {
        shows: [],
        bot_blocked: true,
        status,
        error: `Bot wall on ${url}`,
      };
    }

    let shows: ShowListing[] = [];
    if (source.id === "src_state_theatre") {
      shows = parseStateTheatreHtml(html, source);
    } else if (source.id === "src_elk_cinema") {
      shows = parseElkRapidsCinemaHtml(html, source);
    } else if (source.id === "src_alluvion") {
      shows = parseAlluvionHtml(html, source);
    } else {
      return {
        shows: [],
        bot_blocked: true,
        status,
        error:
          "No Worker HTML parser for this venue — use Desk /api/desk/shows/import",
      };
    }

    return { shows, bot_blocked: false, status, error: null };
  } catch (err) {
    return {
      shows: [],
      bot_blocked: false,
      status: null,
      error: err instanceof Error ? err.message : "Shows HTML pull failed",
    };
  }
}

/** Exported for Desk paste helpers / tests — row shape only. */
export function showListingsToImportRows(
  listings: ShowListing[],
): ShowImportRow[] {
  return listings.map((s) => ({
    title: s.title,
    starts_at: s.starts_at.slice(0, 10),
    ends_at: s.ends_at ? s.ends_at.slice(0, 10) : null,
    times: s.times,
    venue: s.venue,
    url: s.url,
    source_id: s.source_id,
  }));
}
