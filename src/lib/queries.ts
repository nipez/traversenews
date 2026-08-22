import { clusterStories } from "@/lib/pull/cluster";
import { getAppData } from "@/lib/data/store";
import type { ClusteredStory, EventItem, Story } from "@/lib/types";

export async function getHomepageData() {
  const data = await getAppData();
  const clusters = clusterStories(data.stories, data.sources);
  const lead =
    clusters.find((c) => c.is_original) ??
    data.stories.find((s) => s.is_original) ??
    null;
  const around = clusters.filter((c) => !c.is_original).slice(0, 12);
  const moreFromUs = data.stories
    .filter((s) => s.is_original && s.slug !== (lead && "slug" in lead ? lead.slug : null))
    .sort(
      (a, b) =>
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
    )
    .slice(0, 3);

  const now = new Date();
  const weekendEvents = data.events
    .filter((e) => {
      const t = new Date(e.starts_at).getTime();
      return t >= now.getTime() - 60 * 60 * 1000 && t <= now.getTime() + 3 * 24 * 60 * 60 * 1000;
    })
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    .slice(0, 6);

  const civic = civicEvents(data.events, data.sources).slice(0, 6);

  return {
    data,
    lead: lead as ClusteredStory | Story | null,
    around,
    moreFromUs,
    weekendEvents,
    civic,
  };
}

export function civicEvents(
  events: EventItem[],
  sources: { id: string; beat_id: string }[],
  nowMs = Date.now(),
): EventItem[] {
  const civicBeats = new Set(["beat_government", "beat_schools"]);
  const civicSourceIds = new Set(
    sources.filter((s) => civicBeats.has(s.beat_id)).map((s) => s.id),
  );
  return events
    .filter((e) => civicSourceIds.has(e.source_id))
    .filter((e) => new Date(e.starts_at).getTime() >= nowMs - 60 * 60 * 1000)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
}

export async function getEmailPreviewData() {
  const { data, around, weekendEvents, civic } = await getHomepageData();
  const originals = data.stories
    .filter((s) => s.is_original)
    .sort(
      (a, b) =>
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
    );
  const oneToRead =
    around[0] ??
    null;
  // Prefer leading with an original when one exists (product rule)
  const featuredOriginal = originals[0] ?? null;
  const rest = [
    ...(featuredOriginal
      ? [
          {
            title: featuredOriginal.title,
            dek: featuredOriginal.dek,
            sources: ["traverse.news"],
            url: featuredOriginal.url,
          },
        ]
      : []),
    ...around.slice(featuredOriginal ? 0 : 1, featuredOriginal ? 5 : 6).map((c) => ({
      title: c.title,
      dek: c.dek,
      sources: c.sources.map((s) => s.name),
      url: c.url,
    })),
  ].slice(0, 6);

  return {
    featuredOriginal,
    oneToRead,
    rest,
    weekendEvents: weekendEvents.slice(0, 3),
    civic: civic.slice(0, 3),
  };
}
