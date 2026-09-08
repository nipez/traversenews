/**
 * Traverse alert-lane source ids + Desk picker labels.
 * Kept in a leaf module so sites ↔ alerts do not circular-import.
 */

/** Desk Add Alert picker (agency credits first; Ticker FB for true tips only). */
export const TRAVERSE_ALERT_SOURCES = [
  { id: "src_gt911", label: "Grand Traverse 911" },
  { id: "src_gtcrc", label: "GTCRC (Road Commission)" },
  { id: "src_bata_fb", label: "BATA" },
  { id: "src_ticker_fb", label: "Ticker (Facebook)" },
] as const;

/**
 * Homepage Alerts strip + Around-the-bay exclusion allowlist.
 * Includes GTFS `src_bata` (printed/service alerts) plus Facebook agency wires.
 * AA alert sources use `lane: "alert"` / FALLBACK_ALERT — not listed here.
 */
export const ALERT_SOURCE_IDS = new Set<string>([
  ...TRAVERSE_ALERT_SOURCES.map((s) => s.id),
  "src_bata",
]);
