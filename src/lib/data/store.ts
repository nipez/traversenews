import { createSeedData } from "@/lib/data/seed";
import type {
  AppData,
  EventItem,
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

export function getMemoryStore(): AppData {
  if (!globalStore.__traverseStore) {
    globalStore.__traverseStore = cloneSeed();
  }
  return globalStore.__traverseStore;
}

export function resetMemoryStore(data?: AppData): AppData {
  globalStore.__traverseStore = data ? structuredClone(data) : cloneSeed();
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
    // Cloudflare Workers and other read-only runtimes skip persistence.
  }
}

export async function loadStore(): Promise<AppData> {
  const file = await readLocalFileStore();
  if (file) {
    globalStore.__traverseStore = file;
    return file;
  }
  return getMemoryStore();
}

export async function saveStore(data: AppData): Promise<void> {
  globalStore.__traverseStore = data;
  await writeLocalFileStore(data);
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
  const data = await loadStore();
  return data.stories.find((s) => s.is_original && s.slug === slug);
}

export async function replacePulledStories(
  keepOriginals: Story[],
  pulled: Story[],
): Promise<void> {
  const data = await loadStore();
  data.stories = [...keepOriginals, ...pulled];
  data.last_pull_at = new Date().toISOString();
  await saveStore(data);
}

export async function replacePulledEvents(events: EventItem[]): Promise<void> {
  const data = await loadStore();
  // Keep seeded civic/event items that came from html sources; merge by id
  const byId = new Map(data.events.map((e) => [e.id, e]));
  for (const event of events) byId.set(event.id, event);
  data.events = Array.from(byId.values());
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
