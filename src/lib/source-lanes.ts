import type { Source, SourceLane } from "@/lib/types";

/** Traverse fallback IDs — used when KV rows predate `lane`. */
const FALLBACK_ALERT = new Set([
  "src_gt911",
  "src_ticker_fb",
  "src_a2_police_news",
  "src_washtenaw_press",
]);
const FALLBACK_PAYWALL = new Set(["src_re", "src_re_sports", "src_re_prep"]);
const FALLBACK_SHOWS = new Set([
  "src_state_theatre",
  "src_bay_theatre",
  "src_elk_cinema",
  "src_amc_cherry",
  "src_oldtown",
  "src_city_opera",
  "src_theark",
  "src_marquee_shows",
  "src_ums_shows",
  "src_encore_shows",
]);
const FALLBACK_SCHOOL_CAL = new Set([
  "src_tcaps_cal",
  "src_gtacs_cal",
  "src_gta_cal",
  "src_elk_cal",
  "src_suttons_cal",
  "src_leland_cal",
  "src_glenlake_cal",
  "src_kingsley_cal",
  "src_tcch_cal",
  "src_aaps_cal",
  "src_dexter_cal",
  "src_ycs_cal",
  "src_saline_cal",
  "src_chelsea_cal",
]);
const FALLBACK_ATHLETICS = new Set([
  "src_tcc_ath",
  "src_tcw_ath",
  "src_tcsf_ath",
  "src_tcch_ath",
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
  "src_pioneer_ath",
  "src_skyline_ath",
  "src_huron_ath",
  "src_dexter_ath",
  "src_ypsi_ath",
  "src_saline_ath",
  "src_chelsea_ath",
]);
const FALLBACK_CIVIC_IDS = new Set([
  "src_gt_cal",
  "src_civicweb",
  "src_leelanau_co",
  "src_a2_legistar",
  "src_washtenaw_calendar",
]);
const FALLBACK_PREFERRED_NEWS = new Set([
  "src_ticker",
  "src_ipr",
  "src_tcbn",
  "src_northern",
  "src_910",
  "src_omp_gazette",
  "src_glenarbor_sun",
  "src_leelanau_ent",
  "src_elk_news",
  "src_benzie_rp",
  "src_betsie",
  "src_antrim_review",
]);
const FALLBACK_HEAVY = new Set(["src_910"]);
const FALLBACK_EYES = new Set(["src_ticker", "src_northern", "src_tcbn"]);
const FALLBACK_OFFICIAL = new Set([
  "src_city_news",
  "src_leelanau_co",
  "src_gtb",
  "src_a2_news",
  "src_ypsi_news",
  "src_saline_news",
  "src_chelsea_news",
]);
const FALLBACK_UPNORTH = new Set(["src_upnorth"]);
const FALLBACK_PREFERRED_SPORTS = new Set(["src_910_sports"]);
const CIVIC_BEATS = new Set(["beat_government", "beat_schools"]);

export function sourceById(
  sources: Source[] | undefined,
  id: string,
): Source | undefined {
  return sources?.find((s) => s.id === id);
}

export function laneOf(source: Source | undefined, sourceId?: string): SourceLane | undefined {
  if (source?.lane) return source.lane;
  const id = source?.id ?? sourceId ?? "";
  if (FALLBACK_ALERT.has(id)) return "alert";
  if (FALLBACK_SHOWS.has(id)) return "shows";
  if (FALLBACK_SCHOOL_CAL.has(id)) return "school_cal";
  if (FALLBACK_ATHLETICS.has(id)) return "athletics";
  if (FALLBACK_CIVIC_IDS.has(id)) return "civic";
  if (id === "src_tn") return "original";
  return source?.lane;
}

export function isAlertSource(
  source: Source | undefined,
  sourceId?: string,
): boolean {
  return laneOf(source, sourceId) === "alert";
}

export function isShowSourceLane(
  source: Source | undefined,
  sourceId?: string,
): boolean {
  const id = source?.id ?? sourceId ?? "";
  return laneOf(source, sourceId) === "shows" || FALLBACK_SHOWS.has(id);
}

export function isSchoolCalSource(
  source: Source | undefined,
  sourceId?: string,
): boolean {
  const id = source?.id ?? sourceId ?? "";
  return laneOf(source, sourceId) === "school_cal" || FALLBACK_SCHOOL_CAL.has(id);
}

export function isAthleticsSource(
  source: Source | undefined,
  sourceId?: string,
): boolean {
  const id = source?.id ?? sourceId ?? "";
  return laneOf(source, sourceId) === "athletics" || FALLBACK_ATHLETICS.has(id);
}

export function isCivicSourceLane(
  source: { id: string; beat_id: string; lane?: string } | undefined,
): boolean {
  if (!source) return false;
  if (source.lane === "civic") return true;
  return CIVIC_BEATS.has(source.beat_id) || FALLBACK_CIVIC_IDS.has(source.id);
}

export function isPaywalledSource(
  source: Source | undefined,
  sourceId?: string,
): boolean {
  if (source?.paywalled) return true;
  const id = source?.id ?? sourceId ?? "";
  return FALLBACK_PAYWALL.has(id);
}

export function isPreferredNewsSource(
  source: Source | undefined,
  sourceId?: string,
): boolean {
  if ((source?.weight ?? 0) >= 2) return true;
  const id = source?.id ?? sourceId ?? "";
  return FALLBACK_PREFERRED_NEWS.has(id);
}

export function isHeavyWireSource(
  source: Source | undefined,
  sourceId?: string,
): boolean {
  if (source?.heavy) return true;
  const id = source?.id ?? sourceId ?? "";
  return FALLBACK_HEAVY.has(id);
}

export function isEyesOnlySource(
  source: Source | undefined,
  sourceId?: string,
): boolean {
  if (source?.family === "eyes-only") return true;
  const id = source?.id ?? sourceId ?? "";
  return FALLBACK_EYES.has(id);
}

export function isOfficialNewsSource(
  source: Source | undefined,
  sourceId?: string,
): boolean {
  if (source?.family === "official") return true;
  const id = source?.id ?? sourceId ?? "";
  return FALLBACK_OFFICIAL.has(id);
}

export function isUpNorthWireSource(
  source: Source | undefined,
  sourceId?: string,
): boolean {
  if (source?.family === "upnorth") return true;
  const id = source?.id ?? sourceId ?? "";
  return FALLBACK_UPNORTH.has(id);
}

export function isPreferredSportsSource(
  source: Source | undefined,
  sourceId?: string,
): boolean {
  if ((source?.weight ?? 0) >= 2 && source?.beat_id === "beat_sports") {
    return true;
  }
  const id = source?.id ?? sourceId ?? "";
  return FALLBACK_PREFERRED_SPORTS.has(id);
}

export function sourcePlace(source: Source | undefined): string | undefined {
  const p = source?.place?.trim();
  return p || undefined;
}
