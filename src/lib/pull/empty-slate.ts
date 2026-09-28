/**
 * After a pull, warn when an enabled show venue or athletics school has no
 * upcoming rows left in store (does not invent data — only notices emptiness).
 */
import { ATHLETICS_WEEK_DAYS } from "@/lib/athletics";
import { detroitDayKey } from "@/lib/dates";
import { ARBITERLIVE_ATHLETICS_SOURCE_IDS } from "@/lib/pull/arbiterlive";
import { EVENTLINK_ATHLETICS_SOURCE_IDS } from "@/lib/pull/eventlink-feeds";
import { SHOW_SOURCE_IDS, selectUpcomingShows } from "@/lib/shows";
import type { AthleticsGame, ShowListing, Source } from "@/lib/types";

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d + days);
  return new Date(utc).toISOString().slice(0, 10);
}

export function collectEmptySlateWarnings(
  sources: Source[],
  shows: ShowListing[],
  athletics: AthleticsGame[],
  now = new Date(),
): Array<{ source: string; error: string }> {
  const warnings: Array<{ source: string; error: string }> = [];
  const upcomingShows = selectUpcomingShows(shows, now);
  const showCounts = new Map<string, number>();
  for (const s of upcomingShows) {
    showCounts.set(s.source_id, (showCounts.get(s.source_id) ?? 0) + 1);
  }

  const startKey = detroitDayKey(now);
  const endKey = addDaysYmd(startKey, ATHLETICS_WEEK_DAYS);
  const athCounts = new Map<string, number>();
  for (const g of athletics) {
    const key = detroitDayKey(g.starts_at);
    if (key < startKey || key > endKey) continue;
    athCounts.set(g.source_id, (athCounts.get(g.source_id) ?? 0) + 1);
  }

  for (const source of sources) {
    if (!source.enabled) continue;
    if (SHOW_SOURCE_IDS.has(source.id)) {
      if ((showCounts.get(source.id) ?? 0) === 0) {
        warnings.push({
          source: source.name,
          error:
            "No upcoming show rows after pull. Worker keeps prior rows when a scrape returns empty; use Desk /api/desk/shows/import if the venue is bot-blocked.",
        });
      }
      continue;
    }
    const isAthleticsDesk =
      ARBITERLIVE_ATHLETICS_SOURCE_IDS.has(source.id) ||
      EVENTLINK_ATHLETICS_SOURCE_IDS.has(source.id) ||
      source.id.endsWith("_ath");
    if (!isAthleticsDesk) continue;
    if ((athCounts.get(source.id) ?? 0) === 0) {
      warnings.push({
        source: source.name,
        error:
          "No athletics games in the next 7 days after pull. Prior rows are kept when a scrape returns empty; re-check ArbiterLive or POST /api/desk/athletics/import.",
      });
    }
  }
  return warnings;
}
