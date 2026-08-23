import {
  detroitDayKey,
  isDateOnlyStartsAt,
  parseEventStartsAt,
} from "@/lib/dates";
import { HS_ATHLETICS_EVENT_SOURCE_IDS, shortHash } from "@/lib/events";
import type { AthleticsGame, Source } from "@/lib/types";

/** Soft ceiling for stored athletics games (upcoming slate, not a full season). */
export const MAX_STORED_ATHLETICS = 80;

/** Public Sports “This week” horizon in Detroit calendar days (today inclusive). */
export const ATHLETICS_WEEK_DAYS = 7;

export const ATHLETICS_SOURCE_IDS = HS_ATHLETICS_EVENT_SOURCE_IDS;

export type AthleticsImportRow = {
  title: string;
  starts_at?: string;
  place?: string;
  url?: string | null;
  source_id?: string;
  school?: string;
};

export type AthleticsImportResult = {
  imported: AthleticsGame[];
  source_ids: string[];
  skipped: Array<{ index: number; reason: string }>;
};

export function schoolFromSourceId(sourceId: string): string {
  if (sourceId === "src_tcc_ath") return "Central";
  if (sourceId === "src_tcw_ath") return "West";
  return "Prep";
}

export function stableAthleticsId(sourceId: string, uid: string): string {
  return `ath_${shortHash(`${sourceId}:${uid}`)}`;
}

/** Varsity reads slightly louder; JV/frosh stay in the list. */
export function isVarsityGameTitle(title: string): boolean {
  const t = title.toLowerCase();
  if (/\b(jv|j\.v\.|junior varsity|frosh|freshman|freshmen)\b/.test(t)) {
    return /\bvarsity\b/.test(t) && !/\b(jv|j\.v\.|junior varsity)\b/.test(t);
  }
  if (/\bvarsity\b/.test(t)) return true;
  // Standalone " V " / trailing V from Big Teams labels — not "JV".
  if (/(^|[\s(/])v([\s)/]|$)/i.test(title) && !/\bjv\b/i.test(title)) {
    return true;
  }
  return false;
}

/**
 * Keep athletics in their own array. Soft-cap ~80 preferring the near window.
 * Never invents games — only drops.
 */
export function sanitizeStoredAthletics(games: AthleticsGame[]): {
  games: AthleticsGame[];
  changed: boolean;
} {
  const allowed = games.filter((g) => ATHLETICS_SOURCE_IDS.has(g.source_id));
  const byId = new Map<string, AthleticsGame>();
  for (const g of allowed) {
    byId.set(g.id, g);
  }
  let next = [...byId.values()].sort(
    (a, b) =>
      new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
  let changed = next.length !== games.length;

  if (next.length > MAX_STORED_ATHLETICS) {
    const now = Date.now();
    const weekMs = ATHLETICS_WEEK_DAYS * 24 * 60 * 60 * 1000;
    const near = next.filter((g) => {
      const t = new Date(g.starts_at).getTime();
      return t >= now - 12 * 60 * 60 * 1000 && t <= now + weekMs * 2;
    });
    const rest = next
      .filter((g) => !near.includes(g))
      .sort(
        (a, b) =>
          Math.abs(new Date(a.starts_at).getTime() - now) -
          Math.abs(new Date(b.starts_at).getTime() - now),
      );
    const room = Math.max(0, MAX_STORED_ATHLETICS - near.length);
    next = [...near, ...rest.slice(0, room)].sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    );
    changed = true;
  }

  return { games: next, changed };
}

/**
 * Public Sports page: Detroit start-of-today through +7 days only.
 * Do not render a full season into HTML.
 */
export function selectThisWeekAthletics(
  games: AthleticsGame[],
  now = new Date(),
): AthleticsGame[] {
  const todayKey = detroitDayKey(now);
  const end = new Date(now.getTime() + ATHLETICS_WEEK_DAYS * 24 * 60 * 60 * 1000);
  const endKey = detroitDayKey(end);

  return sanitizeStoredAthletics(games)
    .games.filter((g) => {
      const key = detroitDayKey(g.starts_at);
      return key >= todayKey && key <= endKey;
    })
    .sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    );
}

export function groupAthleticsByDay(
  games: AthleticsGame[],
): Array<{ key: string; label: string; items: AthleticsGame[] }> {
  const groups = new Map<string, AthleticsGame[]>();
  for (const g of games) {
    const key = detroitDayKey(g.starts_at);
    const list = groups.get(key) ?? [];
    list.push(g);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, items]) => {
      const d = new Date(items[0].starts_at);
      const label = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Detroit",
        weekday: "long",
        month: "short",
        day: "numeric",
      }).format(d);
      return {
        key,
        label,
        items: [...items].sort(
          (a, b) =>
            new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
        ),
      };
    });
}

/**
 * Normalize browser-pulled athletics rows. Never invents games.
 * Only src_tcc_ath / src_tcw_ath — everything else is skipped.
 */
export function normalizeImportedAthletics(
  rows: AthleticsImportRow[],
  sources: Source[],
): AthleticsImportResult {
  const byId = new Map(sources.map((s) => [s.id, s]));
  const imported: AthleticsGame[] = [];
  const skipped: AthleticsImportResult["skipped"] = [];
  const sourceIds = new Set<string>();

  rows.forEach((row, index) => {
    const title = typeof row.title === "string" ? row.title.trim() : "";
    if (!title) {
      skipped.push({ index, reason: "Missing title" });
      return;
    }

    const sourceId =
      typeof row.source_id === "string" ? row.source_id.trim() : "";
    if (!sourceId) {
      skipped.push({ index, reason: "Missing source_id (src_tcc_ath|src_tcw_ath)" });
      return;
    }
    if (!ATHLETICS_SOURCE_IDS.has(sourceId)) {
      skipped.push({
        index,
        reason: `source_id must be src_tcc_ath or src_tcw_ath (got ${sourceId})`,
      });
      return;
    }
    if (!byId.has(sourceId)) {
      skipped.push({ index, reason: `Unknown source_id: ${sourceId}` });
      return;
    }

    const startsRaw =
      typeof row.starts_at === "string" ? row.starts_at.trim() : "";
    if (!startsRaw) {
      skipped.push({
        index,
        reason: "Need starts_at (naive = America/Detroit). Do not invent kickoff.",
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
        : "Traverse City area";
    const url =
      typeof row.url === "string" && row.url.trim() ? row.url.trim() : null;
    const schoolRaw =
      typeof row.school === "string" ? row.school.trim() : "";
    const school = schoolRaw || schoolFromSourceId(sourceId);
    const timeUnknown = isDateOnlyStartsAt(startsRaw);

    const uid = url
      ? `${url}|${starts.toISOString()}`
      : `${title}|${starts.toISOString()}`;

    const game: AthleticsGame = {
      id: stableAthleticsId(sourceId, uid),
      title,
      starts_at: starts.toISOString(),
      place,
      url,
      source_id: sourceId,
      school,
    };
    if (timeUnknown) game.time_unknown = true;

    imported.push(game);
    sourceIds.add(sourceId);
  });

  return {
    imported,
    source_ids: [...sourceIds],
    skipped,
  };
}
