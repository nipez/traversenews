import {
  detroitDayKey,
  isDateOnlyStartsAt,
  parseEventStartsAt,
} from "@/lib/dates";
import { HS_ATHLETICS_EVENT_SOURCE_IDS, shortHash } from "@/lib/events";
import { getSiteId } from "@/lib/sites";
import {
  ANN_ARBOR_ATHLETICS_CORE_CHIPS,
  ANN_ARBOR_ATHLETICS_CORE_SCHOOLS,
  ANN_ARBOR_ATHLETICS_CORE_SOURCE_IDS,
  ANN_ARBOR_ATHLETICS_SURROUNDING_SCHOOLS,
  ANN_ARBOR_ATHLETICS_SURROUNDING_SOURCE_IDS,
} from "@/lib/sites/ann-arbor/athletics";
import type { AthleticsGame, Source } from "@/lib/types";

/** Soft ceiling for stored athletics games (upcoming slate, not a full season). */
export const MAX_STORED_ATHLETICS = 80;

/** Public Sports “This week” horizon in Detroit calendar days (today inclusive). */
export const ATHLETICS_WEEK_DAYS = 7;

export const ATHLETICS_SOURCE_IDS = HS_ATHLETICS_EVENT_SOURCE_IDS;

/**
 * Traverse City core slate for Sports This week / morning letter (default).
 * Surrounding map-ring schools stay behind the Surrounding control.
 */
export const ATHLETICS_CORE_SOURCE_IDS = new Set([
  "src_tcc_ath",
  "src_tcw_ath",
  "src_tcsf_ath",
  "src_tcch_ath",
]);

export const ATHLETICS_SURROUNDING_SOURCE_IDS = new Set([
  "src_elk_ath",
  "src_suttons_ath",
  "src_leland_ath",
  "src_glenlake_ath",
  "src_kingsley_ath",
  "src_benzie_ath",
  "src_frankfort_ath",
  "src_kalkaska_ath",
  "src_forest_ath",
  "src_mancelona_ath",
  "src_buckley_ath",
  "src_northport_ath",
  "src_centrallake_ath",
]);

/** Chip labels for the TC core slate (Sports This week / Next week). */
export const ATHLETICS_CORE_SCHOOLS = [
  "Central",
  "West",
  "TC St. Francis",
  "TC Christian",
] as const;

export type AthleticsCoreChip = {
  label: string;
  sourceId: string;
  aliases: string[];
};

export function getAthleticsCoreSourceIds(): Set<string> {
  if (getSiteId() === "ann-arbor") {
    return new Set(ANN_ARBOR_ATHLETICS_CORE_SOURCE_IDS);
  }
  return ATHLETICS_CORE_SOURCE_IDS;
}

export function getAthleticsCoreChips(): AthleticsCoreChip[] {
  return getSiteId() === "ann-arbor"
    ? ANN_ARBOR_ATHLETICS_CORE_CHIPS
    : ATHLETICS_CORE_CHIPS;
}

export function getAthleticsCoreSchools(): readonly string[] {
  return getSiteId() === "ann-arbor"
    ? ANN_ARBOR_ATHLETICS_CORE_SCHOOLS
    : ATHLETICS_CORE_SCHOOLS;
}

export function getAthleticsSurroundingSourceIds(): Set<string> {
  if (getSiteId() === "ann-arbor") {
    return new Set(ANN_ARBOR_ATHLETICS_SURROUNDING_SOURCE_IDS);
  }
  return ATHLETICS_SURROUNDING_SOURCE_IDS;
}

export function getAthleticsSurroundingSchools(): readonly string[] {
  return getSiteId() === "ann-arbor"
    ? ANN_ARBOR_ATHLETICS_SURROUNDING_SCHOOLS
    : ATHLETICS_SURROUNDING_SCHOOLS;
}

export const ATHLETICS_CORE_CHIPS: AthleticsCoreChip[] = [
  {
    label: "Central",
    sourceId: "src_tcc_ath",
    aliases: ["central", "traverse city central", "tc central"],
  },
  {
    label: "West",
    sourceId: "src_tcw_ath",
    aliases: ["west", "traverse city west", "tc west"],
  },
  {
    label: "TC St. Francis",
    sourceId: "src_tcsf_ath",
    aliases: [
      "tc st. francis",
      "st. francis",
      "st francis",
      "traverse city st. francis",
    ],
  },
  {
    label: "TC Christian",
    sourceId: "src_tcch_ath",
    aliases: ["tc christian", "traverse city christian"],
  },
];

export const ATHLETICS_SURROUNDING_SCHOOLS = [
  "Elk Rapids",
  "Suttons Bay",
  "Leland",
  "Glen Lake",
  "Kingsley",
  "Benzie Central",
  "Frankfort-Elberta",
  "Kalkaska",
  "Forest Area",
  "Mancelona",
  "Buckley",
  "Northport",
  "Central Lake",
] as const;

function normalizeSchoolName(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

export function coreChipForGame(
  game: AthleticsGame,
): AthleticsCoreChip | null {
  const chips = getAthleticsCoreChips();
  const bySource = chips.find((c) => c.sourceId === game.source_id);
  if (bySource) return bySource;
  const school = normalizeSchoolName(game.school);
  return chips.find((c) => c.aliases.includes(school)) ?? null;
}

/** Public school label in the slate (St. Francis chip wording). */
export function displayAthleticsSchool(game: AthleticsGame): string {
  const chip = coreChipForGame(game);
  if (chip?.sourceId === "src_tcsf_ath") return chip.label;
  return game.school;
}

export function gameMatchesSchoolFilter(
  game: AthleticsGame,
  school: string,
): boolean {
  const wanted = school.trim();
  if (!wanted) return true;
  const chips = getAthleticsCoreChips();
  const chip =
    chips.find((c) => c.label === wanted) ??
    chips.find((c) => c.aliases.includes(normalizeSchoolName(wanted)));
  if (chip) {
    return (
      game.source_id === chip.sourceId ||
      chip.aliases.includes(normalizeSchoolName(game.school))
    );
  }
  return game.school === wanted;
}

export function isCoreAthleticsGame(game: AthleticsGame): boolean {
  if (getAthleticsCoreSourceIds().has(game.source_id)) return true;
  return coreChipForGame(game) != null;
}

export function isSurroundingAthleticsGame(game: AthleticsGame): boolean {
  if (getAthleticsSurroundingSourceIds().has(game.source_id)) return true;
  return getAthleticsSurroundingSchools().includes(game.school);
}

/** Default Sports This week / letter: TC only. Pass includeSurrounding for map-ring. */
export function filterAthleticsSlate(
  games: AthleticsGame[],
  options: { includeSurrounding?: boolean; school?: string | null } = {},
): AthleticsGame[] {
  const includeSurrounding = options.includeSurrounding === true;
  const school = options.school?.trim() || null;
  return games.filter((g) => {
    const inCore = isCoreAthleticsGame(g);
    const inSurrounding = isSurroundingAthleticsGame(g);
    if (!inCore && !inSurrounding) return false;
    if (!includeSurrounding && !inCore) return false;
    if (school && !gameMatchesSchoolFilter(g, school)) return false;
    return true;
  });
}

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
  switch (sourceId) {
    case "src_tcc_ath":
      return "Central";
    case "src_tcw_ath":
      return "West";
    case "src_tcsf_ath":
      return "TC St. Francis";
    case "src_tcch_ath":
      return "TC Christian";
    case "src_elk_ath":
      return "Elk Rapids";
    case "src_suttons_ath":
      return "Suttons Bay";
    case "src_leland_ath":
      return "Leland";
    case "src_glenlake_ath":
      return "Glen Lake";
    case "src_kingsley_ath":
      return "Kingsley";
    case "src_benzie_ath":
      return "Benzie Central";
    case "src_frankfort_ath":
      return "Frankfort-Elberta";
    case "src_kalkaska_ath":
      return "Kalkaska";
    case "src_forest_ath":
      return "Forest Area";
    case "src_mancelona_ath":
      return "Mancelona";
    case "src_buckley_ath":
      return "Buckley";
    case "src_northport_ath":
      return "Northport";
    case "src_centrallake_ath":
      return "Central Lake";
    case "src_pioneer_ath":
      return "Pioneer";
    case "src_skyline_ath":
      return "Skyline";
    case "src_huron_ath":
      return "Huron";
    case "src_dexter_ath":
      return "Dexter";
    case "src_ypsi_ath":
      return "Ypsilanti";
    case "src_saline_ath":
      return "Saline";
    case "src_chelsea_ath":
      return "Chelsea";
    case "src_milan_ath":
      return "Milan";
    default:
      return "Prep";
  }
}

/**
 * Canonical short school label for letter / sports chips.
 * Prefer stored school; fall back to source_id mapping (never invent a team).
 */
export function athleticsSchoolLabel(game: AthleticsGame): string {
  const raw = game.school?.trim();
  if (raw && raw !== "Prep") return raw;
  return schoolFromSourceId(game.source_id);
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
    const capped = [...near, ...rest.slice(0, room)].sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    );
    // Overflow of near-window-only rows must not flag dirty — nothing was dropped.
    if (
      capped.length !== next.length ||
      capped.map((g) => g.id).join(",") !== next.map((g) => g.id).join(",")
    ) {
      next = capped;
      changed = true;
    }
  }

  return { games: next, changed };
}

/**
 * Public Sports page: Detroit start-of-today through +7 days only.
 * Do not render a full season into HTML.
 */
export function athleticsWeekDayBounds(
  now = new Date(),
  weekOffset: 0 | 1 = 0,
): { startKey: string; endKey: string } {
  const dayMs = 24 * 60 * 60 * 1000;
  if (weekOffset === 0) {
    const end = new Date(now.getTime() + ATHLETICS_WEEK_DAYS * dayMs);
    return { startKey: detroitDayKey(now), endKey: detroitDayKey(end) };
  }
  const thisEnd = new Date(now.getTime() + ATHLETICS_WEEK_DAYS * dayMs);
  const nextEnd = new Date(now.getTime() + ATHLETICS_WEEK_DAYS * 2 * dayMs);
  const start = new Date(thisEnd.getTime() + dayMs);
  return { startKey: detroitDayKey(start), endKey: detroitDayKey(nextEnd) };
}

function selectAthleticsInDayBounds(
  games: AthleticsGame[],
  startKey: string,
  endKey: string,
): AthleticsGame[] {
  return sanitizeStoredAthletics(games)
    .games.filter((g) => {
      const key = detroitDayKey(g.starts_at);
      return key >= startKey && key <= endKey;
    })
    .sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    );
}

export function selectThisWeekAthletics(
  games: AthleticsGame[],
  now = new Date(),
): AthleticsGame[] {
  const { startKey, endKey } = athleticsWeekDayBounds(now, 0);
  return selectAthleticsInDayBounds(games, startKey, endKey);
}

/** Seven-day window after This week. Does not invent games. */
export function selectNextWeekAthletics(
  games: AthleticsGame[],
  now = new Date(),
): AthleticsGame[] {
  const { startKey, endKey } = athleticsWeekDayBounds(now, 1);
  return selectAthleticsInDayBounds(games, startKey, endKey);
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
 * Only HS athletics source_ids (greater bay). Everything else is skipped.
 * tcctrojans.net calendars map to src_tcc_ath (Central).
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
      skipped.push({
        index,
        reason:
          "Missing source_id (src_tcc_ath|src_tcw_ath|… greater-bay athletics)",
      });
      return;
    }
    if (!ATHLETICS_SOURCE_IDS.has(sourceId)) {
      skipped.push({
        index,
        reason: `source_id must be an HS athletics desk (got ${sourceId})`,
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
