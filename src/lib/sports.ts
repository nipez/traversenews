import type { Source, Story } from "@/lib/types";

const SPORTS_BEATS = new Set(["beat_sports", "beat_hs_sports"]);

export type SportsStory = Story & {
  source_name: string;
  beat_id: string;
};

/**
 * Pulled sports headlines only (beat_sports + beat_hs_sports).
 * Newest first. Never invents games or scores.
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
    .sort(
      (a, b) =>
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
    )
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
