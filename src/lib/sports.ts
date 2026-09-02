import { looksLikeUmVarsity } from "@/lib/around";
import { isRecordEagleStory } from "@/lib/paywall";
import { getSiteId } from "@/lib/sites";
import { isPreferredSportsSource } from "@/lib/source-lanes";
import type { Source, Story } from "@/lib/types";

const SPORTS_BEATS = new Set(["beat_sports", "beat_hs_sports"]);

const PREP_SPORT_MARKERS = [
  "football",
  "basketball",
  "soccer",
  "volleyball",
  "baseball",
  "softball",
  "hockey",
  "lacrosse",
  "wrestling",
  "tennis",
  "golf",
  "swim",
  "diving",
  "track",
  "cross country",
  "invitational",
  "mhsaa",
];

const PREP_TEAM_MARKERS = [
  "pioneer",
  "skyline",
  "dexter",
  "saline",
  "chelsea",
  "ypsilanti",
  "ypsi",
  "big reds",
  "hornets",
  "grizzlies",
  "huron high",
  "huron hs",
];

/**
 * Washtenaw prep headline already pulled on a general desk (Sun Times Big Reds,
 * Saline–Skyline invitational). Requires a team + a sport — "Huron River" alone
 * is not sports. Never invents a score.
 */
export function looksLikeWashtenawPrep(input: {
  title: string;
  dek?: string;
  url: string;
}): boolean {
  if (looksLikeUmVarsity(input)) return false;
  const blob = `${input.title} ${input.dek ?? ""}`.toLowerCase();
  if (/\bhuron river\b/.test(blob)) return false;
  const team = PREP_TEAM_MARKERS.some((m) => blob.includes(m));
  const sport = PREP_SPORT_MARKERS.some((m) => blob.includes(m));
  if (team && sport) return true;
  if (/\bhigh school\b/.test(blob) && sport) return true;
  if (/\bmhsaa\b/.test(blob)) return true;
  return false;
}

/** Prefer free sports wire when ranking / deduping against Record-Eagle. */
const PREFERRED_SPORTS_SOURCE_IDS = new Set(["src_910_sports"]);

export type SportsStory = Story & {
  source_name: string;
  beat_id: string;
};

function sportsRank(story: Story, source?: Source): number {
  if (isPreferredSportsSource(source, story.source_id)) return 2;
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
    .filter((s) => s.title.trim() && s.url.trim())
    .filter((s) => !looksLikeUmVarsity(s))
    .filter((s) => {
      const src = byId.get(s.source_id);
      if (src != null && SPORTS_BEATS.has(src.beat_id)) return true;
      return getSiteId() === "ann-arbor" && looksLikeWashtenawPrep(s);
    })
    .sort((a, b) => {
      const rankDiff =
        sportsRank(b, byId.get(b.source_id)) -
        sportsRank(a, byId.get(a.source_id));
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
