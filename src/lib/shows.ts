import {
  detroitDayKey,
  isDateOnlyStartsAt,
  parseEventStartsAt,
} from "@/lib/dates";
import { shortHash } from "@/lib/events";
import { getSiteId } from "@/lib/sites";
import { ANN_ARBOR_SHOW_VENUES } from "@/lib/sites/ann-arbor/shows";
import { isShowSourceLane } from "@/lib/source-lanes";
import type { ShowListing, Source } from "@/lib/types";

/** Soft ceiling — grouped titles, not a 14-screen grid dump. */
export const MAX_STORED_SHOWS = 160;

/**
 * Cinema + playhouse sources for /shows.
 * Never land these as EventItems on What's on / Tonight.
 */
export const SHOW_SOURCE_IDS = new Set([
  "src_state_theatre",
  "src_bay_theatre",
  "src_elk_cinema",
  "src_amc_cherry",
  "src_oldtown",
  "src_city_opera",
  "src_alluvion",
  "src_theark",
  "src_marquee_shows",
  "src_ums_shows",
  "src_encore_shows",
]);

export function isShowSource(sourceId: string): boolean {
  return isShowSourceLane(undefined, sourceId);
}

export type ShowVenueSlot = {
  source_id: string;
  name: string;
  homepage: string;
};

/** Stable venue order on /shows (empty-safe slots always render). */
export const SHOW_VENUES: readonly ShowVenueSlot[] = [
  {
    source_id: "src_state_theatre",
    name: "State Theatre / Bijou",
    homepage: "https://stateandbijou.org/",
  },
  {
    source_id: "src_bay_theatre",
    name: "The Bay Theatre",
    homepage: "https://thebaytheatre.org/",
  },
  {
    source_id: "src_elk_cinema",
    name: "Elk Rapids Cinema",
    homepage: "https://www.elkrapidscinema.com/",
  },
  {
    source_id: "src_amc_cherry",
    name: "AMC Cherry Blossom 14",
    homepage:
      "https://www.amctheatres.com/movie-theatres/traverse-city-mi/amc-cherry-blossom-14",
  },
  {
    source_id: "src_oldtown",
    name: "Old Town Playhouse",
    homepage: "https://www.oldtownplayhouse.com/",
  },
  {
    source_id: "src_city_opera",
    name: "City Opera House",
    homepage: "https://www.cityoperahouse.org/",
  },
  {
    source_id: "src_alluvion",
    name: "The Alluvion",
    homepage: "https://www.thealluvion.org/",
  },
] as const;

export function getShowVenues(): readonly ShowVenueSlot[] {
  return getSiteId() === "ann-arbor" ? ANN_ARBOR_SHOW_VENUES : SHOW_VENUES;
}

export function venueNameForSource(sourceId: string): string {
  return (
    getShowVenues().find((v) => v.source_id === sourceId)?.name ?? "Local venue"
  );
}

/**
 * Venue chip labels for /shows. Exact listing.venue strings only —
 * known SHOW_VENUES order first, then any extras (e.g. Milliken) A–Z.
 * Empty-slot venues with no listings are omitted.
 */
export function venuesPresentInListings(listings: ShowListing[]): string[] {
  const present = new Set<string>();
  for (const row of listings) {
    const name = row.venue.trim();
    if (name) present.add(name);
  }
  const ordered: string[] = [];
  for (const slot of getShowVenues()) {
    if (present.has(slot.name)) {
      ordered.push(slot.name);
      present.delete(slot.name);
    }
  }
  const rest = [...present].sort((a, b) => a.localeCompare(b));
  return [...ordered, ...rest];
}

export function stableShowId(sourceId: string, uid: string): string {
  return `show_${shortHash(`${sourceId}:${uid}`)}`;
}

function normalizeTitleKey(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Minutes from a printed clock like "3:30 PM" / "3:30pm". Null if unparsed. */
export function printedClockMinutes(label: string): number | null {
  const raw = label.trim().replace(/\s+/g, " ");
  const m = raw.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2]);
  const ap = m[3].toUpperCase();
  if (ap === "PM" && hour < 12) hour += 12;
  if (ap === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

/** Sort source-printed clocks; never invents a time. */
export function sortPrintedShowTimes(times: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of times) {
    const trimmed = t.trim();
    const key = trimmed.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out.sort((a, b) => {
    const am = printedClockMinutes(a);
    const bm = printedClockMinutes(b);
    if (am == null && bm == null) return a.localeCompare(b);
    if (am == null) return 1;
    if (bm == null) return -1;
    return am - bm;
  });
}

function mergeTimes(a: string[], b: string[]): string[] {
  return sortPrintedShowTimes([...a, ...b]);
}

/**
 * One row per title + venue + Detroit day.
 * Merge same-day clocks only — do not mash Fri–Sun onto Friday.
 * Never invents clocks — only unions what sources already printed.
 */
export function dedupeShows(listings: ShowListing[]): ShowListing[] {
  const byKey = new Map<string, ShowListing>();
  for (const row of listings) {
    const key = `${row.source_id}|${normalizeTitleKey(row.title)}|${detroitDayKey(row.starts_at)}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        ...row,
        times: [...row.times],
      });
      continue;
    }
    const earlier =
      new Date(row.starts_at).getTime() < new Date(existing.starts_at).getTime()
        ? row
        : existing;
    const later =
      earlier === row ? existing : row;
    let ends_at = existing.ends_at ?? null;
    for (const candidate of [row.ends_at, existing.ends_at, later.starts_at]) {
      if (!candidate) continue;
      if (!ends_at || new Date(candidate).getTime() > new Date(ends_at).getTime()) {
        ends_at = candidate;
      }
    }
    byKey.set(key, {
      ...earlier,
      id: earlier.id,
      times: mergeTimes(existing.times, row.times),
      ends_at,
      url: earlier.url || row.url,
      time_unknown:
        earlier.time_unknown === true || row.time_unknown === true
          ? true
          : earlier.time_unknown,
    });
  }
  return Array.from(byKey.values()).sort(
    (a, b) =>
      new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
}

/**
 * Keep shows in their own array. Soft-cap preferring the near window.
 * Never invents listings — only drops.
 */
export function sanitizeStoredShows(listings: ShowListing[]): {
  shows: ShowListing[];
  changed: boolean;
} {
  const allowed = listings.filter((s) => SHOW_SOURCE_IDS.has(s.source_id));
  const cleaned = allowed.map((s) => ({
    ...s,
    title: s.title.trim(),
    venue: s.venue.trim() || venueNameForSource(s.source_id),
    times: Array.isArray(s.times)
      ? s.times.map((t) => t.trim()).filter(Boolean)
      : [],
  }));
  let next = dedupeShows(cleaned);
  let changed =
    next.length !== listings.length ||
    next.map((s) => s.id).join(",") !== listings.map((s) => s.id).join(",");

  if (next.length > MAX_STORED_SHOWS) {
    const now = Date.now();
    const upcoming = next.filter(
      (s) => new Date(s.starts_at).getTime() >= now - 12 * 60 * 60 * 1000,
    );
    const past = next
      .filter((s) => new Date(s.starts_at).getTime() < now - 12 * 60 * 60 * 1000)
      .sort(
        (a, b) =>
          new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime(),
      );
    const room = Math.max(0, MAX_STORED_SHOWS - upcoming.length);
    const capped = dedupeShows([...upcoming, ...past.slice(0, room)]);
    // Overflow of upcoming-only rows must not flag dirty — nothing was dropped.
    if (
      capped.length !== next.length ||
      capped.map((s) => s.id).join(",") !== next.map((s) => s.id).join(",")
    ) {
      next = capped;
      changed = true;
    }
  }

  return { shows: next, changed };
}

/** Public /shows: keep now-playing + coming-up (past runs dropped). */
export function selectUpcomingShows(
  listings: ShowListing[],
  at = new Date(),
  horizonDays = 90,
): ShowListing[] {
  const start = at.getTime() - 12 * 60 * 60 * 1000;
  const end = at.getTime() + horizonDays * 24 * 60 * 60 * 1000;
  return sanitizeStoredShows(listings)
    .shows.filter((s) => {
      const t = new Date(s.starts_at).getTime();
      if (Number.isNaN(t)) return false;
      const endT = s.ends_at ? new Date(s.ends_at).getTime() : t;
      // Still running if ends_at is in the future, even if starts_at was earlier.
      const activeEnd = Number.isNaN(endT) ? t : Math.max(t, endT);
      return activeEnd >= start && t <= end;
    })
    .sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    );
}

export type ShowImportRow = {
  title: string;
  /** ISO or YYYY-MM-DD. Naive datetimes = America/Detroit. */
  starts_at?: string;
  ends_at?: string | null;
  /** Clock labels as printed — never invent when omitted. */
  times?: string[];
  venue?: string;
  url?: string | null;
  source_id?: string;
};

export type ShowImportResult = {
  imported: ShowListing[];
  source_ids: string[];
  skipped: Array<{ index: number; reason: string }>;
};

/**
 * Normalize browser-pulled show rows for Desk import.
 * Never invents titles or times — invalid rows are skipped.
 */
export function normalizeImportedShows(
  rows: ShowImportRow[],
  sources: Source[],
  defaultSourceId = "src_amc_cherry",
): ShowImportResult {
  const byId = new Map(sources.map((s) => [s.id, s]));
  const imported: ShowListing[] = [];
  const skipped: ShowImportResult["skipped"] = [];
  const sourceIds = new Set<string>();

  rows.forEach((row, index) => {
    const title = typeof row.title === "string" ? row.title.trim() : "";
    if (!title) {
      skipped.push({ index, reason: "Missing title" });
      return;
    }

    const sourceId =
      (typeof row.source_id === "string" && row.source_id.trim()) ||
      defaultSourceId;
    if (!byId.has(sourceId)) {
      skipped.push({ index, reason: `Unknown source_id: ${sourceId}` });
      return;
    }
    if (!isShowSource(sourceId)) {
      skipped.push({
        index,
        reason:
          "Not a Shows venue source — use /api/desk/events/import for nights out",
      });
      return;
    }

    const startsRaw =
      typeof row.starts_at === "string" ? row.starts_at.trim() : "";
    if (!startsRaw) {
      skipped.push({
        index,
        reason: "Missing starts_at (date or datetime from the source page)",
      });
      return;
    }
    const starts = parseEventStartsAt(startsRaw);
    if (!starts) {
      skipped.push({ index, reason: `Unparseable starts_at: ${startsRaw}` });
      return;
    }
    const timeUnknown = isDateOnlyStartsAt(startsRaw);

    let ends_at: string | null = null;
    if (typeof row.ends_at === "string" && row.ends_at.trim()) {
      const ends = parseEventStartsAt(row.ends_at.trim());
      if (ends) ends_at = ends.toISOString();
    }

    const times = sortPrintedShowTimes(
      Array.isArray(row.times)
        ? row.times
            .filter((t): t is string => typeof t === "string")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
    );

    const venue =
      (typeof row.venue === "string" && row.venue.trim()) ||
      venueNameForSource(sourceId);
    const url =
      typeof row.url === "string" && row.url.trim() ? row.url.trim() : null;

    const uid = `${normalizeTitleKey(title)}|${detroitDayKey(starts)}`;

    const listing: ShowListing = {
      id: stableShowId(sourceId, uid),
      title,
      venue,
      starts_at: starts.toISOString(),
      ends_at,
      times,
      url,
      source_id: sourceId,
    };
    if (timeUnknown || times.length === 0) listing.time_unknown = true;

    imported.push(listing);
    sourceIds.add(sourceId);
  });

  return {
    imported: dedupeShows(imported),
    source_ids: [...sourceIds],
    skipped,
  };
}

export type PublicShowVenueGroup = {
  source_id: string;
  name: string;
  homepage: string;
  listings: ShowListing[];
};

/** Always return every venue slot; listings may be empty. */
export function groupShowsByVenue(
  listings: ShowListing[],
  at = new Date(),
): PublicShowVenueGroup[] {
  const upcoming = selectUpcomingShows(listings, at);
  return getShowVenues().map((venue) => ({
    ...venue,
    listings: upcoming.filter((s) => s.source_id === venue.source_id),
  }));
}
