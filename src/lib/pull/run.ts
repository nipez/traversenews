import {
  listStories,
  loadStore,
  replacePulledEvents,
  replacePulledStories,
  saveStore,
  snapshotTodaysEdition,
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
  persisted: "kv" | "file" | "memory";
  edition_date: string | null;
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

  const nextAggregated =
    pulledStories.length > 0
      ? pulledStories
      : existing.filter((s) => !s.is_original);

  await replacePulledStories(originals, nextAggregated);
  if (pulledEvents.length > 0) {
    await replacePulledEvents(pulledEvents);
  }

  const store = await loadStore();
  store.last_pull_at = new Date().toISOString();
  await saveStore(store);

  const edition = await snapshotTodaysEdition(new Date());

  let persisted: PullResult["persisted"] = "memory";
  try {
    const { getTraverseDataKv } = await import("@/lib/data/kv");
    const kv = await getTraverseDataKv();
    if (kv) persisted = "kv";
    else if (typeof process !== "undefined" && typeof process.cwd === "function") {
      persisted = "file";
    }
  } catch {
    persisted = "memory";
  }

  return {
    ok: errors.length === 0,
    storiesAdded: pulledStories.length,
    eventsAdded: pulledEvents.length,
    errors,
    last_pull_at: store.last_pull_at,
    persisted,
    edition_date: edition.date,
  };
}
