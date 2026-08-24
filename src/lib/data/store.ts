import { createSeedData } from "@/lib/data/seed";
import { getTraverseDataKv, STORE_KEY } from "@/lib/data/kv";
import { isBannedOriginalSlug, scrubAppData } from "@/lib/data/scrub";
import { STAFF_PUBLISHED_ORIGINALS, STAFF_UNPUBLISHED_DRAFTS } from "@/lib/data/staff-drafts";
import { buildEditionSnapshot, upsertEdition } from "@/lib/editions";
import {
  buildEmailEditionSnapshot,
  upsertEmailEdition,
} from "@/lib/email-editions";
import { sanitizeStoredAthletics } from "@/lib/athletics";
import { sanitizeStoredSchools } from "@/lib/schools";
import { dedupeEvents, sanitizeStoredEvents } from "@/lib/events";
import {
  DEFAULT_ORIGINAL_BYLINE,
  storyFromPublishedDraft,
  uniqueOriginalSlug,
} from "@/lib/originals";
import type {
  AppData,
  AthleticsGame,
  EditionSnapshot,
  EmailEditionSnapshot,
  EventItem,
  EventTip,
  OriginalDraft,
  SchoolCalendarItem,
  Source,
  Story,
  Subscriber,
  Tip,
} from "@/lib/types";
import { newId } from "@/lib/ids";
import { parseEventStartsAt } from "@/lib/dates";
import { stableEventId } from "@/lib/events";

const globalStore = globalThis as typeof globalThis & {
  __traverseStore?: AppData;
  __traverseSkipPublicSnapshots?: number;
};

/**
 * Batch desk/cron writes without rebuilding public snapshots on every
 * intermediate saveStore. Caller must rebuild once afterward.
 */
export async function withSkippedPublicSnapshots<T>(
  fn: () => Promise<T>,
): Promise<T> {
  globalStore.__traverseSkipPublicSnapshots =
    (globalStore.__traverseSkipPublicSnapshots ?? 0) + 1;
  try {
    return await fn();
  } finally {
    globalStore.__traverseSkipPublicSnapshots =
      (globalStore.__traverseSkipPublicSnapshots ?? 1) - 1;
  }
}

function cloneSeed(): AppData {
  return structuredClone(createSeedData());
}

/** Seed catalog once per isolate — normalize used to rebuild it on every KV load. */
let seedCatalog: AppData | null = null;
function getSeedCatalog(): AppData {
  if (!seedCatalog) seedCatalog = createSeedData();
  return seedCatalog;
}

function siteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://traverse-news.nickperez.workers.dev"
  );
}

function normalizeAppData(data: AppData): { data: AppData; scrubbed: boolean } {
  if (!Array.isArray(data.editions)) {
    data.editions = [];
  }
  if (!Array.isArray(data.drafts)) {
    data.drafts = [];
  } else {
    for (const draft of data.drafts) {
      if (draft.go_live_at === undefined) {
        draft.go_live_at = null;
      }
    }
  }
  if (!Array.isArray(data.athletics)) {
    data.athletics = [];
  }
  if (!Array.isArray(data.schools)) {
    data.schools = [];
  }
  if (!Array.isArray(data.email_editions)) {
    data.email_editions = [];
  }
  if (!Array.isArray(data.tips)) {
    data.tips = [];
  }
  if (!Array.isArray(data.event_tips)) {
    data.event_tips = [];
  }

  let catalogChanged = false;
  const seed = getSeedCatalog();

  // Merge new beats from seed (e.g. Public safety) without dropping Desk order tweaks.
  if (!Array.isArray(data.beats)) {
    data.beats = structuredClone(seed.beats);
    catalogChanged = true;
  } else {
    const beatById = new Map(data.beats.map((b) => [b.id, b]));
    for (const beat of seed.beats) {
      const existing = beatById.get(beat.id);
      if (!existing) {
        data.beats.push(structuredClone(beat));
        catalogChanged = true;
        continue;
      }
      if (
        existing.name !== beat.name ||
        existing.slug !== beat.slug ||
        existing.sort !== beat.sort
      ) {
        existing.name = beat.name;
        existing.slug = beat.slug;
        existing.sort = beat.sort;
        catalogChanged = true;
      }
    }
    data.beats.sort((a, b) => a.sort - b.sort);
  }

  const byId = new Map(data.sources.map((s) => [s.id, s]));
  for (const source of seed.sources) {
    const existing = byId.get(source.id);
    if (!existing) {
      data.sources.push(structuredClone(source));
      catalogChanged = true;
      continue;
    }
    // Keep Desk enable; refresh feed wiring + notes for known catalog rows.
    if (
      existing.feed_url !== source.feed_url ||
      existing.pull_method !== source.pull_method ||
      existing.homepage !== source.homepage ||
      existing.beat_id !== source.beat_id ||
      existing.name !== source.name ||
      existing.notes !== source.notes ||
      (source.calendar_url ?? null) !== (existing.calendar_url ?? null) ||
      (source.calendar_pdf_url ?? null) !== (existing.calendar_pdf_url ?? null)
    ) {
      existing.feed_url = source.feed_url;
      existing.pull_method = source.pull_method;
      existing.homepage = source.homepage;
      existing.beat_id = source.beat_id;
      existing.name = source.name;
      existing.notes = source.notes;
      existing.calendar_url = source.calendar_url ?? null;
      existing.calendar_pdf_url = source.calendar_pdf_url ?? null;
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
 * After a successful write, rebuilds compact public page snapshots so visitor
 * GETs never re-cluster the full store.
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
  try {
    if (!(globalStore.__traverseSkipPublicSnapshots ?? 0)) {
      const { writeAllPublicSnapshots } = await import("@/lib/public-snapshots");
      await writeAllPublicSnapshots(data);
    }
  } catch {
    // Snapshot rebuild is best-effort — never fail a Desk save over cache.
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
  await repairPublishedOriginalStories();
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

/**
 * Replace story rows for specific source_ids only (Facebook alerts import).
 * Keeps originals and wire from every other source.
 */
export async function replaceStoriesForSources(
  stories: Story[],
  sourceIds: string[],
): Promise<void> {
  const data = await loadStore();
  const targets = new Set(sourceIds);
  const kept = data.stories.filter((s) => !targets.has(s.source_id));
  const incoming = new Map<string, Story>();
  for (const story of stories) {
    if (!targets.has(story.source_id)) continue;
    if (story.is_original) continue;
    incoming.set(story.id, story);
  }
  data.stories = [...kept, ...incoming.values()];
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
  data.events = sanitizeStoredEvents(
    dedupeEvents([...kept, ...incoming.values()]),
  ).events;
  await saveStore(data);
}

/**
 * Replace athletics games for the given sources (or all incoming source ids).
 * Never writes into `events` — HS calendars stay on `athletics` only.
 */
export async function replaceAthleticsGames(
  games: AthleticsGame[],
  pulledSourceIds?: string[],
): Promise<void> {
  const data = await loadStore();
  if (!Array.isArray(data.athletics)) data.athletics = [];
  const sourceIds = new Set(
    pulledSourceIds && pulledSourceIds.length > 0
      ? pulledSourceIds
      : games.map((g) => g.source_id),
  );
  const kept = data.athletics.filter((g) => !sourceIds.has(g.source_id));
  const incoming = new Map<string, AthleticsGame>();
  for (const game of games) {
    incoming.set(game.id, game);
  }
  data.athletics = sanitizeStoredAthletics([
    ...kept,
    ...incoming.values(),
  ]).games;
  await saveStore(data);
}

/**
 * Replace district school-calendar rows for the given sources.
 * Never writes into `events`.
 */
export async function replaceSchoolCalendarItems(
  items: SchoolCalendarItem[],
  pulledSourceIds?: string[],
): Promise<void> {
  const data = await loadStore();
  if (!Array.isArray(data.schools)) data.schools = [];
  const sourceIds = new Set(
    pulledSourceIds && pulledSourceIds.length > 0
      ? pulledSourceIds
      : items.map((g) => g.source_id),
  );
  const kept = data.schools.filter((g) => !sourceIds.has(g.source_id));
  const incoming = new Map<string, SchoolCalendarItem>();
  for (const item of items) {
    incoming.set(item.id, item);
  }
  data.schools = sanitizeStoredSchools([
    ...kept,
    ...incoming.values(),
  ]).items;
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

const TIPS_SOFT_CAP = 200;

export async function addTip(input: {
  body: string;
  name?: string | null;
  email?: string | null;
  url?: string | null;
}): Promise<Tip> {
  const data = await loadStore();
  const body = input.body.replace(/\s+/g, " ").trim();
  const row: Tip = {
    id: newId("tip"),
    body,
    name: input.name?.trim() || null,
    email: input.email?.trim().toLowerCase() || null,
    url: input.url?.trim() || null,
    created_at: new Date().toISOString(),
  };
  data.tips = [row, ...data.tips].slice(0, TIPS_SOFT_CAP);
  await saveStore(data);
  return row;
}

export async function listTips(): Promise<Tip[]> {
  const data = await loadStore();
  return [...data.tips].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

const EVENT_TIPS_SOFT_CAP = 200;
export const READER_EVENTS_SOURCE_ID = "src_reader_events";

export async function addEventTip(input: {
  title: string;
  date: string;
  time?: string | null;
  place?: string | null;
  url?: string | null;
  note?: string | null;
  name?: string | null;
  email?: string | null;
}): Promise<EventTip> {
  const data = await loadStore();
  const row: EventTip = {
    id: newId("etip"),
    title: input.title.trim(),
    date: input.date.trim(),
    time: input.time?.trim() || null,
    place: input.place?.trim() || null,
    url: input.url?.trim() || null,
    note: input.note?.trim() || null,
    name: input.name?.trim() || null,
    email: input.email?.trim().toLowerCase() || null,
    created_at: new Date().toISOString(),
    status: "pending",
    event_id: null,
  };
  data.event_tips = [row, ...(data.event_tips ?? [])].slice(
    0,
    EVENT_TIPS_SOFT_CAP,
  );
  await saveStore(data);
  return row;
}

export async function listEventTips(): Promise<EventTip[]> {
  const data = await loadStore();
  return [...(data.event_tips ?? [])].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

/** Merge one EventItem without wiping other rows for that source. */
export async function upsertEvent(event: EventItem): Promise<void> {
  const data = await loadStore();
  const next = data.events.filter((e) => e.id !== event.id);
  next.push(event);
  data.events = sanitizeStoredEvents(dedupeEvents(next)).events;
  await saveStore(data);
}

/**
 * Confirm a pending reader event tip into public `events` (src_reader_events).
 * Does not invent a clock — date-only → time_unknown.
 */
export async function confirmEventTip(
  id: string,
): Promise<{ tip: EventTip; event: EventItem }> {
  const data = await loadStore();
  const tip = (data.event_tips ?? []).find((t) => t.id === id);
  if (!tip) throw new Error("Tip not found");
  if (tip.status === "dismissed") throw new Error("Tip was dismissed");
  if (tip.status === "confirmed" && tip.event_id) {
    const existing = data.events.find((e) => e.id === tip.event_id);
    if (existing) return { tip, event: existing };
  }

  const timeUnknown = !tip.time;
  const startsRaw = tip.time
    ? `${tip.date}T${tip.time}`
    : tip.date;
  const starts = parseEventStartsAt(startsRaw);
  if (!starts) throw new Error("Invalid date/time on tip");

  const uid = tip.url
    ? `${tip.url}|${starts.toISOString()}`
    : `${tip.title}|${starts.toISOString()}|${tip.id}`;
  const event: EventItem = {
    id: stableEventId(READER_EVENTS_SOURCE_ID, uid),
    title: tip.title,
    starts_at: starts.toISOString(),
    place: tip.place?.trim() || "",
    url: tip.url,
    source_id: READER_EVENTS_SOURCE_ID,
  };
  if (timeUnknown) event.time_unknown = true;

  tip.status = "confirmed";
  tip.event_id = event.id;
  data.event_tips = data.event_tips.map((t) => (t.id === id ? tip : t));

  const next = data.events.filter((e) => e.id !== event.id);
  next.push(event);
  data.events = sanitizeStoredEvents(dedupeEvents(next)).events;
  await saveStore(data);
  return { tip, event };
}

export async function dismissEventTip(id: string): Promise<EventTip> {
  const data = await loadStore();
  const tip = (data.event_tips ?? []).find((t) => t.id === id);
  if (!tip) throw new Error("Tip not found");
  tip.status = "dismissed";
  data.event_tips = data.event_tips.map((t) => (t.id === id ? tip : t));
  await saveStore(data);
  return tip;
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

export async function listEmailEditions(): Promise<EmailEditionSnapshot[]> {
  const data = await loadStore();
  return [...(data.email_editions ?? [])].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
}

export async function getEmailEdition(
  date: string,
): Promise<EmailEditionSnapshot | undefined> {
  const data = await loadStore();
  return (data.email_editions ?? []).find((e) => e.date === date);
}

/**
 * Capture / replace today's morning-email letter from the live mix.
 * Does not send mail.
 */
export async function snapshotTodaysEmailEdition(
  at = new Date(),
): Promise<EmailEditionSnapshot> {
  const data = await loadStore();
  if (!Array.isArray(data.email_editions)) data.email_editions = [];
  const snapshot = buildEmailEditionSnapshot(data, at);
  data.email_editions = upsertEmailEdition(data.email_editions, snapshot);
  await saveStore(data);
  return snapshot;
}

/**
 * Ensure staff-only drafts exist without clobbering a published original.
 * Uses upsertDraft (KV on Workers). Never downgrades published → draft.
 */
export async function ensureStaffUnpublishedDrafts(): Promise<void> {
  const data = await loadStore();
  const byId = new Map(data.drafts.map((d) => [d.id, d]));
  const bySlug = new Map(
    data.drafts.filter((d) => d.slug).map((d) => [d.slug as string, d]),
  );

  for (const staff of STAFF_UNPUBLISHED_DRAFTS) {
    const existing =
      byId.get(staff.id) ||
      (staff.slug ? bySlug.get(staff.slug) : undefined);

    // Already present — leave Nick's Desk edits / publish state alone.
    if (existing?.id === staff.id) continue;
    // Published under another id for the same slug — do not replace with a draft.
    if (existing?.status === "published") continue;

    if (existing && existing.id !== staff.id) {
      data.drafts = data.drafts.filter((d) => d.id !== existing.id);
      await saveStore(data);
    }

    await upsertDraft({
      ...staff,
      status: "draft",
      published_story_id: null,
      published_at: null,
    });
  }

  await ensurePublishedStaffOriginals();
  await repairPublishedOriginalStories();
}

/**
 * Nick already hit Publish on these — keep status=published and the matching
 * is_original Story in the same store publishDraft uses.
 */
export async function ensurePublishedStaffOriginals(): Promise<void> {
  for (const staff of STAFF_PUBLISHED_ORIGINALS) {
    const data = await loadStore();
    const existing = data.drafts.find((d) => d.id === staff.id);
    const slug = staff.slug?.trim();
    if (!slug || isBannedOriginalSlug(slug)) continue;

    const hasStory = data.stories.some(
      (s) => s.is_original && (s.slug === slug || s.id === staff.published_story_id),
    );

    if (existing?.status === "published" && hasStory) continue;

    // Upsert full copy first (may still be draft if a prior ensure clobbered it).
    await upsertDraft({
      ...staff,
      ...existing,
      id: staff.id,
      title: existing?.title?.trim() || staff.title,
      dek: existing?.dek?.trim() || staff.dek,
      body: existing?.body?.trim() ? existing.body : staff.body,
      section: existing?.section?.trim() || staff.section,
      byline: existing?.byline?.trim() || staff.byline,
      slug,
      image_url: existing?.image_url ?? staff.image_url ?? null,
      image_credit: existing?.image_credit ?? staff.image_credit ?? null,
      image_caption: existing?.image_caption ?? staff.image_caption ?? null,
      source_urls:
        existing?.source_urls?.length ? existing.source_urls : staff.source_urls,
      status: existing?.status === "published" ? "published" : "draft",
      published_story_id: existing?.published_story_id ?? null,
      published_at: existing?.published_at ?? null,
      created_at: existing?.created_at ?? staff.created_at,
    });

    if (existing?.status !== "published" || !hasStory) {
      await publishDraft(staff.id);
    }
  }
}

/** If a draft is published but its is_original Story is missing, recreate it. */
export async function repairPublishedOriginalStories(): Promise<void> {
  const data = await loadStore();
  let changed = false;

  for (let i = 0; i < data.drafts.length; i++) {
    const draft = data.drafts[i];
    if (draft.status !== "published") continue;
    const slug = draft.slug?.trim();
    if (!slug || isBannedOriginalSlug(slug)) continue;

    const hasStory = data.stories.some(
      (s) =>
        s.is_original &&
        (s.slug === slug ||
          (draft.published_story_id != null && s.id === draft.published_story_id)),
    );
    if (hasStory) continue;

    const story = storyFromPublishedDraft(draft, slug, siteOrigin());
    draft.published_story_id = story.id;
    data.drafts[i] = { ...draft };
    data.stories.push(story);
    changed = true;
  }

  if (changed) await saveStore(data);
}

export async function listDrafts(): Promise<OriginalDraft[]> {
  await ensureStaffUnpublishedDrafts();
  const data = await loadStore();
  return [...data.drafts].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function getDraft(id: string): Promise<OriginalDraft | undefined> {
  await ensureStaffUnpublishedDrafts();
  const data = await loadStore();
  return data.drafts.find((d) => d.id === id);
}

export async function upsertDraft(draft: OriginalDraft): Promise<OriginalDraft> {
  const data = await loadStore();
  const imageUrl = draft.image_url?.trim() || null;
  const next: OriginalDraft = {
    ...draft,
    title: draft.title.trim(),
    dek: draft.dek.trim(),
    body: draft.body,
    byline: draft.byline.trim() || DEFAULT_ORIGINAL_BYLINE,
    section: draft.section?.trim() || null,
    image_url: imageUrl,
    image_credit: imageUrl ? draft.image_credit?.trim() || null : null,
    image_caption: imageUrl ? draft.image_caption?.trim() || null : null,
    source_urls: draft.source_urls.map((u) => u.trim()).filter(Boolean),
    go_live_at: draft.go_live_at?.trim() || null,
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
    // Publish now and scheduled go-live both clear the schedule.
    go_live_at: null,
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

/**
 * Publish drafts whose go_live_at has been reached.
 * Same path as Publish now (publishDraft → saveStore → public snapshots).
 * Cheap no-op when nothing is due.
 */
export async function publishDueDrafts(
  now = new Date(),
): Promise<{ published: string[]; errors: { id: string; error: string }[] }> {
  const data = await loadStore();
  const nowMs = now.getTime();
  const due = data.drafts.filter(
    (d) =>
      d.status === "draft" &&
      d.go_live_at != null &&
      d.go_live_at.trim() !== "" &&
      !Number.isNaN(new Date(d.go_live_at).getTime()) &&
      new Date(d.go_live_at).getTime() <= nowMs,
  );

  const published: string[] = [];
  const errors: { id: string; error: string }[] = [];

  // One at a time so each publishDraft rebuilds snapshots once (lead updates).
  for (const draft of due.sort((a, b) =>
    (a.go_live_at ?? "").localeCompare(b.go_live_at ?? ""),
  )) {
    try {
      await publishDraft(draft.id);
      published.push(draft.id);
    } catch (err) {
      errors.push({
        id: draft.id,
        error: err instanceof Error ? err.message : "Publish failed",
      });
    }
  }

  return { published, errors };
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
