/**
 * Bay Theatre (Indy Systems) public GraphQL showtimes.
 *
 * Requires headers the consumer SPA sends:
 *   site-id: 322, circuit-id: 148, client-type: consumer
 * Without those, showingsForDate returns permission 102.
 *
 * Never invents showtimes. Groups by title per Detroit day.
 */
import { detroitDayKey, detroitWallToUtc } from "@/lib/dates";
import { getSite } from "@/lib/sites";
import { stableShowId, venueNameForSource } from "@/lib/shows";
import type { ShowListing, Source } from "@/lib/types";

export type BayShowsPullResult = {
  shows: ShowListing[];
  bot_blocked: boolean;
  status: number | null;
  error: string | null;
};

export const BAY_THEATRE_GRAPHQL = "https://thebaytheatre.org/graphql";
export const BAY_THEATRE_SITE_ID = 322;
export const BAY_THEATRE_CIRCUIT_ID = 148;
export const BAY_THEATRE_HORIZON_DAYS = 21;

type BayShowing = {
  id?: string;
  time?: string;
  published?: boolean;
  private?: boolean;
  movie?: { id?: string; name?: string; urlSlug?: string | null } | null;
};

function formatClockFromUtcIso(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Detroit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(d);
  const hour = parts.find((p) => p.type === "hour")?.value;
  const minute = parts.find((p) => p.type === "minute")?.value;
  const dayPeriod = parts.find((p) => p.type === "dayPeriod")?.value;
  if (!hour || !minute || !dayPeriod) return null;
  const h = Number(hour);
  const mer = dayPeriod.toUpperCase().startsWith("P") ? "PM" : "AM";
  return `${h}:${minute} ${mer}`;
}

function detroitYmd(d: Date): string {
  return detroitDayKey(d);
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const utc = detroitWallToUtc(y, m, d, 12, 0, 0);
  return detroitYmd(new Date(utc.getTime() + days * 24 * 60 * 60 * 1000));
}

function bayHeaders(): HeadersInit {
  return {
    "User-Agent": getSite().userAgent,
    Accept: "application/json",
    "Content-Type": "application/json",
    Origin: "https://thebaytheatre.org",
    Referer: "https://thebaytheatre.org/",
    "site-id": String(BAY_THEATRE_SITE_ID),
    "circuit-id": String(BAY_THEATRE_CIRCUIT_ID),
    "client-type": "consumer",
  };
}

const SHOWINGS_QUERY = `query showingsForDate($date: String!, $siteIds: [ID!]) {
  showingsForDate(date: $date, siteIds: $siteIds) {
    data {
      id
      time
      published
      private
      movie { id name urlSlug }
    }
    count
  }
}`;

/**
 * Group published, non-private showings into ShowListing rows (one per title/day).
 * Exported for tests — never invents a clock.
 */
export function bayShowingsToListings(
  showings: BayShowing[],
  source: Source,
  now = new Date(),
): ShowListing[] {
  const venue = venueNameForSource(source.id);
  const floor = now.getTime() - 12 * 60 * 60 * 1000;
  const horizon =
    now.getTime() + BAY_THEATRE_HORIZON_DAYS * 24 * 60 * 60 * 1000;
  const groups = new Map<
    string,
    { title: string; day: string; times: string[]; url: string | null }
  >();

  for (const s of showings) {
    if (s.published === false) continue;
    if (s.private === true) continue;
    const title = s.movie?.name?.trim();
    const timeIso = typeof s.time === "string" ? s.time.trim() : "";
    if (!title || !timeIso) continue;
    const t = new Date(timeIso).getTime();
    if (Number.isNaN(t) || t < floor || t > horizon) continue;
    const day = detroitDayKey(timeIso);
    const clock = formatClockFromUtcIso(timeIso);
    if (!clock) continue;
    const key = `${title.toLowerCase()}|${day}`;
    const slug = s.movie?.urlSlug?.trim();
    const url = slug
      ? `https://thebaytheatre.org/movie/${slug}`
      : source.homepage;
    const existing = groups.get(key);
    if (existing) {
      if (!existing.times.includes(clock)) existing.times.push(clock);
      continue;
    }
    groups.set(key, { title, day, times: [clock], url });
  }

  const out: ShowListing[] = [];
  for (const g of groups.values()) {
    const [y, mo, d] = g.day.split("-").map(Number);
    const startsIso = detroitWallToUtc(y, mo, d, 0, 0, 0).toISOString();
    const uid = `${g.title.toLowerCase()}|${g.day}`;
    out.push({
      id: stableShowId(source.id, uid),
      title: g.title,
      venue,
      starts_at: startsIso,
      ends_at: null,
      times: g.times,
      url: g.url,
      source_id: source.id,
    });
  }
  return out.sort(
    (a, b) =>
      new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime() ||
      a.title.localeCompare(b.title),
  );
}

async function fetchShowingsForDate(
  date: string,
): Promise<{ ok: boolean; status: number; showings: BayShowing[]; error?: string }> {
  const res = await fetch(BAY_THEATRE_GRAPHQL, {
    method: "POST",
    headers: bayHeaders(),
    body: JSON.stringify({
      operationName: "showingsForDate",
      variables: {
        date,
        siteIds: [BAY_THEATRE_SITE_ID],
      },
      query: SHOWINGS_QUERY,
    }),
  });
  const status = res.status;
  const text = await res.text();
  let json: {
    data?: { showingsForDate?: { data?: BayShowing[] } };
    errors?: Array<{ message?: string }>;
    error?: { message?: string };
  };
  try {
    json = JSON.parse(text) as typeof json;
  } catch {
    return {
      ok: false,
      status,
      showings: [],
      error: `Bay GraphQL non-JSON (${status})`,
    };
  }
  if (
    status === 403 ||
    /permission/i.test(json.errors?.[0]?.message || "") ||
    /permission/i.test(json.error?.message || "")
  ) {
    return {
      ok: false,
      status: status === 200 ? 403 : status,
      showings: [],
      error: json.errors?.[0]?.message || json.error?.message || "permission denied",
    };
  }
  const showings = json.data?.showingsForDate?.data;
  if (!Array.isArray(showings)) {
    return {
      ok: false,
      status,
      showings: [],
      error: json.errors?.[0]?.message || json.error?.message || "empty GraphQL data",
    };
  }
  return { ok: true, status, showings };
}

/**
 * Pull Bay Theatre showtimes for today through +21 Detroit days via GraphQL.
 */
export async function pullBayTheatreShows(
  source: Source,
  now = new Date(),
): Promise<BayShowsPullResult> {
  const start = detroitYmd(now);
  const collected: BayShowing[] = [];
  let lastStatus: number | null = null;

  for (let i = 0; i <= BAY_THEATRE_HORIZON_DAYS; i++) {
    const date = addDaysYmd(start, i);
    try {
      const result = await fetchShowingsForDate(date);
      lastStatus = result.status;
      if (!result.ok) {
        if (result.status === 403 || /permission/i.test(result.error || "")) {
          return {
            shows: [],
            bot_blocked: true,
            status: result.status,
            error: result.error || "Bay GraphQL permission denied",
          };
        }
        return {
          shows: [],
          bot_blocked: false,
          status: result.status,
          error: result.error || `Bay GraphQL failed for ${date}`,
        };
      }
      collected.push(...result.showings);
    } catch (err) {
      return {
        shows: [],
        bot_blocked: false,
        status: lastStatus,
        error: err instanceof Error ? err.message : "Bay GraphQL pull failed",
      };
    }
  }

  return {
    shows: bayShowingsToListings(collected, source, now),
    bot_blocked: false,
    status: lastStatus,
    error: null,
  };
}
