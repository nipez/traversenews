import {
  listStories,
  loadStore,
  replacePulledEvents,
  replacePulledStories,
  saveStore,
} from "@/lib/data/store";
import { pullIcsSource } from "@/lib/pull/ics";
import { pullRssSource } from "@/lib/pull/rss";
import type { EventItem, Story } from "@/lib/types";

export type PullResult = {
  ok: boolean;
  storiesAdded: number;
  eventsAdded: number;
  errors: Array<{ source: string; error: string }>;
  last_pull_at: string;
};

export async function runPull(): Promise<PullResult> {
  const data = await loadStore();
  const enabled = data.sources.filter((s) => s.enabled);
  const errors: Array<{ source: string; error: string }> = [];
  const pulledStories: Story[] = [];
  const pulledEvents: EventItem[] = [];

  for (const source of enabled) {
    try {
      if (source.pull_method === "rss") {
        const items = await pullRssSource(source);
        pulledStories.push(...items);
      } else if (source.pull_method === "ics") {
        const items = await pullIcsSource(source);
        pulledEvents.push(...items);
      }
      // html / facebook / original / none skipped in v1
    } catch (err) {
      errors.push({
        source: source.name,
        error: err instanceof Error ? err.message : "Unknown pull error",
      });
    }
  }

  const existing = await listStories();
  const originals = existing.filter((s) => s.is_original);
  // Keep a few seed aggregated stories if pull returned nothing useful
  const fallbackAgg =
    pulledStories.length === 0
      ? existing.filter((s) => !s.is_original)
      : pulledStories;

  await replacePulledStories(originals, fallbackAgg);
  if (pulledEvents.length > 0) {
    await replacePulledEvents(pulledEvents);
  }

  const store = await loadStore();
  store.last_pull_at = new Date().toISOString();
  await saveStore(store);

  return {
    ok: errors.length === 0,
    storiesAdded: pulledStories.length,
    eventsAdded: pulledEvents.length,
    errors,
    last_pull_at: store.last_pull_at,
  };
}
