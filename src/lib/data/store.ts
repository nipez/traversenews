import { createSeedData } from "@/lib/data/seed";
import { getTraverseDataKv, STORE_KEY } from "@/lib/data/kv";
import { isBannedOriginalSlug, scrubAppData } from "@/lib/data/scrub";
import { buildEditionSnapshot, upsertEdition } from "@/lib/editions";
import { dedupeEvents } from "@/lib/events";
import {
  DEFAULT_ORIGINAL_BYLINE,
  storyFromPublishedDraft,
  uniqueOriginalSlug,
} from "@/lib/originals";
import type {
  AppData,
  EditionSnapshot,
  EventItem,
  OriginalDraft,
  Source,
  Story,
  Subscriber,
} from "@/lib/types";

const globalStore = globalThis as typeof globalThis & {
  __traverseStore?: AppData;
};

function cloneSeed(): AppData {
  return structuredClone(createSeedData());
}

function siteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://traverse.news"
  );
}

function normalizeAppData(data: AppData): { data: AppData; scrubbed: boolean } {
  if (!Array.isArray(data.editions)) {
    data.editions = [];
  }
  if (!Array.isArray(data.drafts)) {
    data.drafts = [];
  }

  let catalogChanged = false;
  const seed = createSeedData();
  const byId = new Map(data.sources.map((s) => [s.id, s]));
  for (const source of seed.sources) {
    const existing = byId.get(source.id);
    if (!existing) {
      data.sources.push(structuredClone(source));
      catalogChanged = true;
      continue;
    }
    // Keep Desk enable/notes; refresh feed wiring for known catalog rows.
    if (
      existing.feed_url !== source.feed_url ||
      existing.pull_method !== source.pull_method ||
      existing.homepage !== source.homepage ||
      existing.beat_id !== source.beat_id
    ) {
      existing.feed_url = source.feed_url;
      existing.pull_method = source.pull_method;
      existing.homepage = source.homepage;
      existing.beat_id = source.beat_id;
      existing.name = source.name;
      catalogChanged = true;
    }
  }

  const { data: scrubbed, changed } = scrubAppData(data);
  return { data: scrubbed, scrubbed: changed || catalogChanged };
}

export function getMemoryStore(): AppData {
  if (!globalStore.__traverseStore) {
    globalStore.__traverseStore = cloneSeed();
  }
  return globalStore.__traverseStore;
}

export function resetMemoryStore(data?: AppData): AppData {
  if (data) {
    globalStore.__traverseStore = normalizeAppData(structuredClone(data)).data;
  } else {
    globalStore.__traverseStore = cloneSeed();
  }
  return globalStore.__traverseStore;
}

export async function readLocalFileStore(): Promise<AppData | null> {
  if (typeof process === "undefined" || !process.cwd) return null;
  try {
    const { promises: fs } = await import("fs");
    const path = await import("path");
    const file = path.join(process.cwd(), ".data", "store.json");
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as AppData;
  } catch {
    return null;
  }
}

export async function writeLocalFileStore(data: AppData): Promise<void> {
  if (typeof process === "undefined" || !process.cwd) return;
  try {
    const { promises: fs } = await import("fs");
    const path = await import("path");
    const dir = path.join(process.cwd(), ".data");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, "store.json"),
      JSON.stringify(data, null, 2),
      "utf8",
    );
  } catch {
    // Read-only runtimes skip file persistence.
  }
}

async function readKvStore(): Promise<AppData | null> {
  const kv = await getTraverseDataKv();
  if (!kv) return null;
  try {
    const raw = await kv.get(STORE_KEY, "text");
    if (!raw) return null;
    return JSON.parse(raw) as AppData;
  } catch {
    return null;
  }
}

async function writeKvStore(data: AppData): Promise<boolean> {
  const kv = await getTraverseDataKv();
  if (!kv) return false;
  await kv.put(STORE_KEY, JSON.stringify(data));
  return true;
}

/**
 * Load order: Cloudflare KV (Workers) → local `.data/store.json` → in-memory seed.
 * Invented seed journalism is stripped on load; if anything was removed, we persist.
 */
export async function loadStore(): Promise<AppData> {
  const fromKv = await readKvStore();
  if (fromKv) {
    const { data, scrubbed } = normalizeAppData(fromKv);
    globalStore.__traverseStore = data;
    if (scrubbed) await saveStore(data);
    return data;
  }

  const file = await readLocalFileStore();
  if (file) {
    const { data, scrubbed } = normalizeAppData(file);
    globalStore.__traverseStore = data;
    if (scrubbed) await saveStore(data);
    return data;
  }

  return getMemoryStore();
}

/**
 * Persist to KV when bound (Workers / wrangler preview). Always update memory.
 * Also writes `.data/store.json` during local Node/`next dev` when possible.
 */
export async function saveStore(data: AppData): Promise<void> {
  globalStore.__traverseStore = data;
  const wroteKv = await writeKvStore(data);
  if (!wroteKv) {
    await writeLocalFileStore(data);
  } else {
    // Keep a local copy when developing against remote/preview bindings.
    await writeLocalFileStore(data);
  }
}

export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export async function listSources(): Promise<Source[]> {
  const data = await loadStore();
  return data.sources;
}

export async function getSource(id: string): Promise<Source | undefined> {
  const data = await loadStore();
  return data.sources.find((s) => s.id === id);
}

export async function upsertSource(source: Source): Promise<Source> {
  const data = await loadStore();
  const idx = data.sources.findIndex((s) => s.id === source.id);
  if (idx >= 0) data.sources[idx] = source;
  else data.sources.push(source);
  await saveStore(data);
  return source;
}

export async function listStories(): Promise<Story[]> {
  const data = await loadStore();
  return data.stories;
}

export async function getOriginalBySlug(slug: string): Promise<Story | undefined> {
  if (isBannedOriginalSlug(slug)) return undefined;
  const data = await loadStore();
  return data.stories.find((s) => s.is_original && s.slug === slug);
}

export async function replacePulledStories(
  keepOriginals: Story[],
  pulled: Story[],
): Promise<void> {
  const data = await loadStore();
  // Live RSS replaces seed "around the bay" placeholders entirely.
  data.stories = [...keepOriginals, ...pulled];
  data.last_pull_at = new Date().toISOString();
  await saveStore(data);
}

export async function replacePulledEvents(
  events: EventItem[],
  pulledSourceIds?: string[],
): Promise<void> {
  const data = await loadStore();
  const sourceIds = new Set(
    pulledSourceIds && pulledSourceIds.length > 0
      ? pulledSourceIds
      : events.map((e) => e.source_id),
  );
  // Drop prior rows from sources we just pulled so random-id dupes cannot pile up.
  const kept = data.events.filter((e) => !sourceIds.has(e.source_id));
  const incoming = new Map<string, EventItem>();
  for (const event of events) {
    incoming.set(event.id, event);
  }
  data.events = dedupeEvents([...kept, ...incoming.values()]);
  await saveStore(data);
}

export async function listEvents(): Promise<EventItem[]> {
  const data = await loadStore();
  return data.events;
}

export async function addSubscriber(email: string): Promise<Subscriber> {
  const data = await loadStore();
  const normalized = email.trim().toLowerCase();
  const existing = data.subscribers.find((s) => s.email === normalized);
  if (existing) return existing;
  const row: Subscriber = {
    email: normalized,
    created_at: new Date().toISOString(),
  };
  data.subscribers.push(row);
  await saveStore(data);
  return row;
}

export async function getBeats() {
  const data = await loadStore();
  return data.beats;
}

export async function getAppData(): Promise<AppData> {
  return loadStore();
}

export async function listEditions(): Promise<EditionSnapshot[]> {
  const data = await loadStore();
  return [...data.editions].sort((a, b) => b.date.localeCompare(a.date));
}

export async function getEdition(date: string): Promise<EditionSnapshot | undefined> {
  const data = await loadStore();
  return data.editions.find((e) => e.date === date);
}

/** Snapshot today's clustered homepage into the edition archive (upsert by Detroit date). */
export async function snapshotTodaysEdition(at = new Date()): Promise<EditionSnapshot> {
  const data = await loadStore();
  const snapshot = buildEditionSnapshot(data, at);
  data.editions = upsertEdition(data.editions, snapshot);
  await saveStore(data);
  return snapshot;
}

export async function listDrafts(): Promise<OriginalDraft[]> {
  const data = await loadStore();
  return [...data.drafts].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function getDraft(id: string): Promise<OriginalDraft | undefined> {
  const data = await loadStore();
  return data.drafts.find((d) => d.id === id);
}

export async function upsertDraft(draft: OriginalDraft): Promise<OriginalDraft> {
  const data = await loadStore();
  const next: OriginalDraft = {
    ...draft,
    title: draft.title.trim(),
    dek: draft.dek.trim(),
    body: draft.body,
    byline: draft.byline.trim() || DEFAULT_ORIGINAL_BYLINE,
    section: draft.section?.trim() || null,
    source_urls: draft.source_urls.map((u) => u.trim()).filter(Boolean),
    updated_at: new Date().toISOString(),
  };

  // Keep the public story in sync when this draft is already published.
  if (next.status === "published") {
    const slug = uniqueOriginalSlug(
      next.title,
      data.stories,
      next.slug,
      next.published_story_id,
    );
    next.slug = slug;
    const story = storyFromPublishedDraft(next, slug, siteOrigin());
    next.published_story_id = story.id;
    const sIdx = data.stories.findIndex((s) => s.id === story.id);
    if (sIdx >= 0) data.stories[sIdx] = story;
    else data.stories.push(story);
  }

  const idx = data.drafts.findIndex((d) => d.id === next.id);
  if (idx >= 0) data.drafts[idx] = next;
  else data.drafts.push(next);

  await saveStore(data);
  return next;
}

export async function deleteDraft(id: string): Promise<boolean> {
  const data = await loadStore();
  const draft = data.drafts.find((d) => d.id === id);
  if (!draft) return false;
  data.drafts = data.drafts.filter((d) => d.id !== id);
  if (draft.published_story_id) {
    data.stories = data.stories.filter((s) => s.id !== draft.published_story_id);
  }
  await saveStore(data);
  return true;
}

export async function publishDraft(id: string): Promise<OriginalDraft> {
  const data = await loadStore();
  const idx = data.drafts.findIndex((d) => d.id === id);
  if (idx < 0) throw new Error("Draft not found");
  const draft = data.drafts[idx];
  if (!draft.title.trim()) throw new Error("Title is required to publish");
  if (draft.source_urls.length === 0) {
    throw new Error("Add at least one source permalink before publishing");
  }

  const now = new Date().toISOString();
  const slug = uniqueOriginalSlug(
    draft.title,
    data.stories,
    draft.slug,
    draft.published_story_id,
  );
  if (isBannedOriginalSlug(slug)) {
    throw new Error("That slug is reserved / banned");
  }

  const next: OriginalDraft = {
    ...draft,
    status: "published",
    slug,
    byline: draft.byline.trim() || DEFAULT_ORIGINAL_BYLINE,
    published_at: draft.published_at ?? now,
    updated_at: now,
  };
  const story = storyFromPublishedDraft(next, slug, siteOrigin());
  next.published_story_id = story.id;

  data.drafts[idx] = next;
  const sIdx = data.stories.findIndex((s) => s.id === story.id);
  if (sIdx >= 0) data.stories[sIdx] = story;
  else data.stories.push(story);

  await saveStore(data);
  return next;
}

export async function unpublishDraft(id: string): Promise<OriginalDraft> {
  const data = await loadStore();
  const idx = data.drafts.findIndex((d) => d.id === id);
  if (idx < 0) throw new Error("Draft not found");
  const draft = data.drafts[idx];
  if (draft.published_story_id) {
    data.stories = data.stories.filter((s) => s.id !== draft.published_story_id);
  }
  const next: OriginalDraft = {
    ...draft,
    status: "draft",
    published_story_id: null,
    published_at: null,
    updated_at: new Date().toISOString(),
  };
  data.drafts[idx] = next;
  await saveStore(data);
  return next;
}
