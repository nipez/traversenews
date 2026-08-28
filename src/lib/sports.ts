import { isRecordEagleStory } from "@/lib/paywall";
import type { Source, Story } from "@/lib/types";

const SPORTS_BEATS = new Set(["beat_sports", "beat_hs_sports"]);

/** Prefer free sports wire when ranking / deduping against Record-Eagle. */
const PREFERRED_SPORTS_SOURCE_IDS = new Set(["src_910_sports"]);

export type SportsStory = Story & {
  source_name: string;
  beat_id: string;
};

function sportsRank(story: Story): number {
  if (PREFERRED_SPORTS_SOURCE_IDS.has(story.source_id)) return 2;
  if (isRecordEagleStory(story)) return 0;
  return 1;
}

/**
 * Pulled sports headlines only (beat_sports + beat_hs_sports).
 * Prefer 9&10 when both exist; newest as tiebreaker. Never invents games or scores.
 */
export function selectSportsStories(
  stories: Story[],
  sources: Source[],
  options: { limit?: number } = {},
): SportsStory[] {
  const limit = options.limit ?? 40;
  const byId = new Map(sources.map((s) => [s.id, s]));

  return stories
    .filter((s) => !s.is_original)
    .filter((s) => {
      const src = byId.get(s.source_id);
      return src != null && SPORTS_BEATS.has(src.beat_id);
    })
    .filter((s) => s.title.trim() && s.url.trim())
    .sort((a, b) => {
      const rankDiff = sportsRank(b) - sportsRank(a);
      if (rankDiff !== 0) return rankDiff;
      return (
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
      );
    })
    .slice(0, limit)
    .map((s) => {
      const src = byId.get(s.source_id)!;
      return {
        ...s,
        source_name: src.name,
        beat_id: src.beat_id,
      };
    });
}
