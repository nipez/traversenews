import type {
  EditionSnapshot,
  EventItem,
  Source,
  Story,
} from "@/lib/types";

export type SourceStoryRow = Story & {
  on_homepage: boolean;
  edition_dates: string[];
};

export type SourceEventRow = EventItem & {
  edition_dates: string[];
};

export type SourceInventory = {
  source: Source;
  beat_name: string;
  stories: SourceStoryRow[];
  events: SourceEventRow[];
  story_count: number;
  event_count: number;
  empty_hint: string;
};

function storyOnEdition(story: Story, ed: EditionSnapshot): boolean {
  const cards = [...(ed.lead ? [ed.lead] : []), ...ed.around];
  return cards.some(
    (c) =>
      (story.url && c.url === story.url) ||
      (story.slug != null && c.slug != null && c.slug === story.slug) ||
      (c.title === story.title &&
        c.published_at.slice(0, 10) === story.published_at.slice(0, 10)),
  );
}

function eventOnEdition(event: EventItem, ed: EditionSnapshot): boolean {
  const cards = [...ed.events, ...ed.civic];
  return cards.some(
    (c) =>
      (event.url && c.url && event.url === c.url) ||
      (c.title === event.title &&
        c.starts_at.slice(0, 16) === event.starts_at.slice(0, 16)),
  );
}

function emptyHint(source: Source, storyCount: number, eventCount: number): string {
  if (storyCount > 0 || eventCount > 0) return "";
  if (source.pull_method === "facebook" || source.pull_method === "html") {
    if (
      source.id === "src_interlochen" ||
      source.id === "src_tadl" ||
      source.id === "src_visit_events"
    ) {
      return "No items yet. Run pull — or Need Traverse News to pull this URL on the live computer if the calendar is bot-blocked.";
    }
    return "No items yet. Run pull or this method is not fetched in v1 (html/facebook).";
  }
  if (source.pull_method === "none" || source.pull_method === "original") {
    return "No items yet. This method is not fetched in v1.";
  }
  return "No items yet. Run pull.";
}

/**
 * Read-only inventory of store rows for one source. Never invents items.
 */
export function buildSourceInventory(input: {
  source: Source;
  beat_name: string;
  stories: Story[];
  events: EventItem[];
  editions: EditionSnapshot[];
  homepageStoryUrls: Set<string>;
  homepageStoryIds: Set<string>;
}): SourceInventory {
  const { source } = input;
  const stories = input.stories
    .filter((s) => s.source_id === source.id)
    .sort(
      (a, b) =>
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
    )
    .map((s) => ({
      ...s,
      on_homepage:
        input.homepageStoryIds.has(s.id) ||
        (Boolean(s.url) && input.homepageStoryUrls.has(s.url)),
      edition_dates: input.editions
        .filter((ed) => storyOnEdition(s, ed))
        .map((ed) => ed.date),
    }));

  const events = input.events
    .filter((e) => e.source_id === source.id)
    .sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    )
    .map((e) => ({
      ...e,
      edition_dates: input.editions
        .filter((ed) => eventOnEdition(e, ed))
        .map((ed) => ed.date),
    }));

  return {
    source,
    beat_name: input.beat_name,
    stories,
    events,
    story_count: stories.length,
    event_count: events.length,
    empty_hint: emptyHint(source, stories.length, events.length),
  };
}
