import { detroitWallToUtc } from "@/lib/dates";
import { looksLikeLowValueListing, stableEventId } from "@/lib/events";
import { getSite } from "@/lib/sites";
import type { EventItem, ShowListing, Source } from "@/lib/types";

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

/**
 * Parse "Saturday, August 22, 2026 - 6:30 p.m. ET" into an ISO instant.
 * Missing clock time → null (never invent noon).
 */
export function parseLooseEventWhen(raw: string, now = new Date()): Date | null {
  const text = stripTags(raw);
  const m = text.match(
    /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})\s*[-–]\s*(\d{1,2}):(\d{2})\s*([ap])\.?m\.?/i,
  );
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  if (month === undefined) return null;
  const day = Number(m[2]);
  const year = Number(m[3]);
  let hour = Number(m[4]) % 12;
  const minute = Number(m[5]);
  if (m[6].toLowerCase() === "p") hour += 12;
  const d = detroitWallToUtc(year, month + 1, day, hour, minute, 0);
  if (Number.isNaN(d.getTime())) return null;
  if (Math.abs(d.getTime() - now.getTime()) > 1000 * 60 * 60 * 24 * 400) {
    return null;
  }
  return d;
}

function withinHorizon(d: Date, now: Date): boolean {
  const t = d.getTime();
  return (
    t >= now.getTime() - 1000 * 60 * 60 * 12 &&
    t <= now.getTime() + 1000 * 60 * 60 * 24 * 45
  );
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
    const starts = parseLooseEventWhen(dateText || "", now);
    // Slug date alone has no clock — skip rather than invent 7pm/noon.
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

/** Parse TADL listing aria-label clock: "@ 2:00pm" / "@ 12:00pm". Not "@ 12:00am". */
function parseTadlAriaClock(label: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} | null {
  const m = label.match(
    /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})\s*@\s*(\d{1,2}):(\d{2})\s*(am|pm)/i,
  );
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  if (month === undefined) return null;
  const hour12 = Number(m[4]);
  const minute = Number(m[5]);
  const ap = m[6].toLowerCase();
  // All-day / closed placeholders often use 12:00am — not a real showtime.
  if (ap === "am" && hour12 === 12 && minute === 0) return null;
  let hour = hour12 % 12;
  if (ap === "pm") hour += 12;
  return {
    year: Number(m[3]),
    month: month + 1,
    day: Number(m[2]),
    hour,
    minute,
  };
}

function extractJsonLdStart(html: string): {
  start: Date;
  name: string | null;
  place: string | null;
} | null {
  const blocks = html.match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  if (!blocks) return null;
  for (const block of blocks) {
    const raw = block.replace(/^[\s\S]*?>/, "").replace(/<\/script>$/i, "");
    try {
      const data = JSON.parse(raw) as
        | Record<string, unknown>
        | Array<Record<string, unknown>>;
      const nodes = Array.isArray(data) ? data : [data];
      for (const node of nodes) {
        const type = String(node["@type"] ?? "");
        if (!/event/i.test(type)) continue;
        const startRaw = node.startDate;
        if (typeof startRaw !== "string" || !startRaw.trim()) continue;
        // Require an explicit clock — date-only would be noon-risk; skip.
        if (!/T\d{2}:\d{2}/.test(startRaw)) continue;
        const start = new Date(startRaw);
        if (Number.isNaN(start.getTime())) continue;
        const name = typeof node.name === "string" ? stripTags(node.name) : null;
        let place: string | null = null;
        const loc = node.location;
        if (typeof loc === "string") place = loc;
        else if (loc && typeof loc === "object") {
          const locObj = loc as { name?: string; address?: unknown };
          if (typeof locObj.name === "string") place = locObj.name;
        }
        return { start, name, place };
      }
    } catch {
      // try next block
    }
  }
  return null;
}

type TadlListing = {
  title: string;
  url: string;
  placeHint: string;
  ariaLabel: string;
};

function collectTadlListings(html: string): TadlListing[] {
  const articles = html.match(
    /<article[^>]*class="[^"]*event-card[^"]*"[\s\S]*?<\/article>/gi,
  );
  if (!articles) return [];
  const out: TadlListing[] = [];
  for (const article of articles) {
    const link = article.match(
      /<a\b([^>]*class="[^"]*lc-event__link[^"]*"[^>]*)>([\s\S]*?)<\/a>/i,
    );
    if (!link) continue;
    const attrs = link[1];
    const href = attrs.match(/\bhref=["']([^"']+)["']/i)?.[1]?.trim();
    if (!href) continue;
    const aria = decodeEntities(
      attrs.match(/\baria-label=["']([^"']+)["']/i)?.[1] ?? "",
    );
    const title = stripTags(link[2]);
    if (!title || looksLikeLowValueListing(title)) continue;

    const place =
      stripTags(
        article.match(/lc-event__location[^>]*>([\s\S]*?)<\//i)?.[1] ??
          article.match(/lc-event__branch[^>]*>([\s\S]*?)<\//i)?.[1] ??
          "",
      ) || "TADL";
    const url = href.startsWith("http") ? href : `https://www.tadl.org${href}`;
    out.push({ title, url, placeHint: place, ariaLabel: aria });
  }
  return out;
}

/**
 * TADL upcoming page is HTML (not ICS). Prefer each event page's JSON-LD
 * startDate (includes America/Detroit offset). Never invent noon.
 */
async function parseTadl(
  html: string,
  source: Source,
  now: Date,
): Promise<EventItem[]> {
  const listings = collectTadlListings(html);
  const out: EventItem[] = [];

  async function resolveOne(listing: TadlListing): Promise<EventItem | null> {
    let starts: Date | null = null;
    let place = listing.placeHint;
    let title = listing.title;

    try {
      const res = await fetch(listing.url, {
        headers: {
          "User-Agent":
            `Mozilla/5.0 (compatible; ${getSite().userAgent})`,
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
      });
      if (res.ok) {
        const page = await res.text();
        const ld = extractJsonLdStart(page);
        if (ld) {
          starts = ld.start;
          if (ld.name) title = ld.name;
          if (ld.place) place = ld.place;
        }
      }
    } catch {
      // fall through to aria-label clock
    }

    if (!starts) {
      const clock = parseTadlAriaClock(listing.ariaLabel);
      if (!clock) return null;
      starts = detroitWallToUtc(
        clock.year,
        clock.month,
        clock.day,
        clock.hour,
        clock.minute,
        0,
      );
    }

    if (!withinHorizon(starts, now)) return null;
    if (looksLikeLowValueListing(title)) return null;

    return {
      id: stableEventId(source.id, `${title}|${starts.toISOString()}`),
      title,
      starts_at: starts.toISOString(),
      place,
      url: listing.url,
      source_id: source.id,
    };
  }

  // Bound concurrency so a library listing page does not stampede.
  const chunkSize = 5;
  for (let i = 0; i < listings.length; i += chunkSize) {
    const chunk = listings.slice(i, i + chunkSize);
    const settled = await Promise.all(chunk.map((l) => resolveOne(l)));
    for (const item of settled) {
      if (item) out.push(item);
    }
  }

  return out.sort(
    (a, b) =>
      new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
}

/**
 * Best-effort HTML event pull for desks that do not expose ICS.
 * Visit TC (Simpleview) is often bot-blocked from datacenter IPs — empty is OK.
 * Do NOT invent events. Ask Traverse News to pull the URL on the live computer
 * and POST the list to /api/desk/events/import.
 */
export type HtmlEventsPullResult = {
  events: EventItem[];
  /** Optional Shows rows (Ark / Encore) — never invents clocks. */
  shows?: ShowListing[];
  bot_blocked: boolean;
  status: number | null;
};

export async function pullHtmlEvents(
  source: Source,
): Promise<HtmlEventsPullResult> {
  if (!source.feed_url) {
    return { events: [], bot_blocked: false, status: null };
  }
  const res = await fetch(source.feed_url, {
    headers: {
      "User-Agent":
        `Mozilla/5.0 (compatible; ${getSite().userAgent})`,
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });
  if (!res.ok) {
    if (res.status === 403 || res.status === 401 || res.status === 429) {
      return { events: [], bot_blocked: true, status: res.status };
    }
    throw new Error(`HTML event fetch failed ${res.status} for ${source.name}`);
  }
  const html = await res.text();
  if (/access denied|akamai|forbidden/i.test(html.slice(0, 500))) {
    return { events: [], bot_blocked: true, status: res.status };
  }
  const now = new Date();
  const host = (() => {
    try {
      return new URL(source.feed_url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();

  let events: EventItem[] = [];
  if (host.includes("interlochen.org") || source.id === "src_interlochen") {
    events = parseInterlochen(html, source, now);
  } else if (host.includes("tadl.org") || source.id === "src_tadl") {
    events = await parseTadl(html, source, now);
  } else if (
    host.includes("traversecity.com") ||
    source.id === "src_visit_events"
  ) {
    events = [];
    if (!/<script/i.test(html) && html.length < 2000) {
      return { events: [], bot_blocked: true, status: res.status };
    }
    return {
      events: [],
      bot_blocked: true,
      status: res.status,
    };
  }

  return { events, bot_blocked: false, status: res.status };
}
