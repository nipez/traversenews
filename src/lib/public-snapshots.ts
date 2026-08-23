/**
 * Compact public page snapshots — written on desk/cron data changes,
 * read as 1–3 well-known KV keys on visitor GETs.
 *
 * Never uses kv.list. Never walks the full store on a public request
 * when the snapshot is warm. Missing snapshot → load store once,
 * rebuild all snapshots, return (no N+1).
 */

import { cache } from "react";
import { selectAlerts } from "@/lib/alerts";
import { selectAroundTheBay } from "@/lib/around";
import {
  selectThisWeekAthletics,
} from "@/lib/athletics";
import { getTraverseDataKv } from "@/lib/data/kv";
import { isBannedOriginalSlug } from "@/lib/data/scrub";
import { buildEmailEditionSnapshot } from "@/lib/email-editions";
import {
  dedupeEvents,
  eventInUpcomingWindow,
  isCivicEvent,
  isHsAthleticsEventSource,
  looksLikeLowValueListing,
  selectTonightEvents,
} from "@/lib/events";
import { PUBLIC_ORIGINAL_BYLINE } from "@/lib/originals";
import { clusterStories } from "@/lib/pull/cluster";
import {
  groupSchoolDaysByDistrict,
  SCHOOL_DISTRICT_CALENDAR_PDF_URLS,
  SCHOOL_DISTRICT_CALENDAR_URLS,
  selectUpcomingSchoolDays,
  sourceIdForDistrict,
} from "@/lib/schools";
import {
  buildSitemapXml,
  SITEMAP_CACHE_KEY,
  SITEMAP_TTL_SECONDS,
} from "@/lib/sitemap";
import { selectSportsStories } from "@/lib/sports";
import { storySectionLabel } from "@/lib/story-display";
import type {
  AppData,
  AthleticsGame,
  ClusteredStory,
  EditionSnapshot,
  EmailEditionSnapshot,
  EventItem,
  SchoolCalendarItem,
  Source,
  Story,
} from "@/lib/types";

function selectCivicUpcoming(
  events: EventItem[],
  sources: Source[],
  nowMs: number,
): EventItem[] {
  const now = new Date(nowMs);
  return dedupeEvents(events)
    .filter((e) => isCivicEvent(e, sources))
    .filter((e) => eventInUpcomingWindow(e, now));
}

/** Well-known public snapshot keys (never list prefixes on GET). */
export const PUBLIC_KEYS = {
  home: "public:home:v1",
  schools: "public:schools:v1",
  events: "public:events:v1",
  civic: "public:civic:v1",
  sports: "public:sports:v1",
  email: "public:email:v1",
  alerts: "public:alerts:v1",
  editions: "public:editions:v1",
  emailArchive: "public:email-archive:v1",
  originals: "public:originals:v1",
} as const;

export type PublicSnapshotKey = (typeof PUBLIC_KEYS)[keyof typeof PUBLIC_KEYS];

export type PublicAlertCard = {
  id: string;
  title: string;
  dek: string;
  url: string;
  source_name: string;
  published_at: string;
};

export type PublicLeadCard = {
  id: string;
  title: string;
  dek: string;
  url: string;
  published_at: string;
  is_original: true;
  byline: string | null;
  slug: string | null;
  image_url: string | null;
  image_credit: string | null;
  image_caption: string | null;
};

export type PublicAroundCard = {
  id: string;
  title: string;
  dek: string;
  url: string;
  published_at: string;
  sources: Array<{ id: string; name: string }>;
  is_original: false;
  byline: null;
  slug: null;
  image_url: null;
  body: null;
};

export type PublicHomeSnapshot = {
  v: 1;
  captured_at: string;
  lead: PublicLeadCard | null;
  around: PublicAroundCard[];
  weekendEvents: EventItem[];
  civic: EventItem[];
  alerts: PublicAlertCard[];
};

export type PublicSchoolsSnapshot = {
  v: 1;
  captured_at: string;
  districts: Array<{
    district: string;
    calendarUrl: string | null;
    calendarPdfUrl: string | null;
    months: Array<{
      key: string;
      name: string;
      items: SchoolCalendarItem[];
    }>;
  }>;
};

export type PublicEventsSnapshot = {
  v: 1;
  captured_at: string;
  featured: EventItem[];
  upcoming: EventItem[];
};

export type PublicCivicSnapshot = {
  v: 1;
  captured_at: string;
  events: EventItem[];
};

export type PublicSportsStoryCard = {
  id: string;
  title: string;
  url: string;
  published_at: string;
  source_id: string;
  source_name: string;
  beat_id: string;
};

export type PublicSportsSnapshot = {
  v: 1;
  captured_at: string;
  weekGames: AthleticsGame[];
  stories: PublicSportsStoryCard[];
};

export type PublicEmailSnapshot = {
  v: 1;
  captured_at: string;
  letter: EmailEditionSnapshot;
};

export type PublicAlertsSnapshot = {
  v: 1;
  captured_at: string;
  alerts: PublicAlertCard[];
};

export type PublicEditionsSnapshot = {
  v: 1;
  captured_at: string;
  editions: EditionSnapshot[];
};

export type PublicEmailArchiveSnapshot = {
  v: 1;
  captured_at: string;
  letters: EmailEditionSnapshot[];
};

export type PublicOriginalCard = {
  id: string;
  slug: string;
  title: string;
  dek: string;
  body: string | null;
  url: string;
  published_at: string;
  byline: string | null;
  image_url: string | null;
  image_credit: string | null;
  image_caption: string | null;
  source_urls: string[];
  section: string | null;
};

export type PublicOriginalsSnapshot = {
  v: 1;
  captured_at: string;
  /** slug → original (published staff pieces only). */
  bySlug: Record<string, PublicOriginalCard>;
};

const EVENTS_HORIZON_DAYS = 12;

function compactEvent(e: EventItem): EventItem {
  const out: EventItem = {
    id: e.id,
    title: e.title,
    starts_at: e.starts_at,
    place: e.place,
    url: e.url,
    source_id: e.source_id,
  };
  if (e.time_unknown) out.time_unknown = true;
  return out;
}

function toLead(lead: ClusteredStory | Story): PublicLeadCard {
  return {
    id: lead.id,
    title: lead.title,
    dek: lead.dek,
    url: lead.url,
    published_at: lead.published_at,
    is_original: true,
    byline: lead.is_original ? PUBLIC_ORIGINAL_BYLINE : lead.byline,
    slug: lead.slug,
    image_url: lead.image_url,
    image_credit:
      "image_credit" in lead && typeof lead.image_credit === "string"
        ? lead.image_credit
        : null,
    image_caption:
      "image_caption" in lead && typeof lead.image_caption === "string"
        ? lead.image_caption
        : null,
  };
}

function toAround(c: ClusteredStory): PublicAroundCard {
  return {
    id: c.id,
    title: c.title,
    dek: c.dek,
    url: c.url,
    published_at: c.published_at,
    sources: c.sources.map((s) => ({ id: s.id, name: s.name })),
    is_original: false,
    byline: null,
    slug: null,
    image_url: null,
    body: null,
  };
}

function toAlert(a: {
  id: string;
  title: string;
  dek: string;
  url: string;
  source_name: string;
  published_at: string;
}): PublicAlertCard {
  return {
    id: a.id,
    title: a.title,
    dek: a.dek,
    url: a.url,
    source_name: a.source_name,
    published_at: a.published_at,
  };
}

export function buildHomeSnapshot(data: AppData, at = new Date()): PublicHomeSnapshot {
  const clusters = clusterStories(data.stories, data.sources);
  const originals = clusters.filter((c) => c.is_original);
  const around = selectAroundTheBay(
    clusters.filter((c) => !c.is_original),
    {
      limit: 18,
      maxPerSource: 4,
      maxSports: 4,
      maxRecordEagle: 3,
      maxUpNorth: 3,
    },
  );
  const lead = originals[0] ?? null;
  const weekendEvents = selectTonightEvents(data.events, data.sources, {
    now: at,
    limit: 6,
    horizonDays: 5,
    maxPerSource: 3,
    timedOnly: true,
  }).map(compactEvent);
  const civic = selectCivicUpcoming(data.events, data.sources, at.getTime())
    .slice(0, 6)
    .map(compactEvent);
  const alerts = selectAlerts(data.stories, data.sources, { limit: 3 }).map(
    toAlert,
  );

  return {
    v: 1,
    captured_at: at.toISOString(),
    lead: lead ? toLead(lead) : null,
    around: around.map(toAround),
    weekendEvents,
    civic,
    alerts,
  };
}

export function buildSchoolsSnapshot(
  data: AppData,
  at = new Date(),
): PublicSchoolsSnapshot {
  const upcoming = selectUpcomingSchoolDays(data.schools ?? [], at);
  const grouped = groupSchoolDaysByDistrict(upcoming, { includeEmpty: false });
  const districts = grouped.map((block) => {
    const sourceId = sourceIdForDistrict(block.district);
    const source = sourceId
      ? data.sources.find((s) => s.id === sourceId)
      : undefined;
    return {
      district: block.district,
      calendarUrl:
        source?.calendar_url ||
        SCHOOL_DISTRICT_CALENDAR_URLS[block.district] ||
        null,
      calendarPdfUrl:
        source?.calendar_pdf_url ||
        SCHOOL_DISTRICT_CALENDAR_PDF_URLS[block.district] ||
        null,
      months: block.months,
    };
  });
  return { v: 1, captured_at: at.toISOString(), districts };
}

export function buildEventsSnapshot(
  data: AppData,
  at = new Date(),
): PublicEventsSnapshot {
  const featured = selectTonightEvents(data.events, data.sources, {
    now: at,
    limit: 3,
    horizonDays: EVENTS_HORIZON_DAYS,
    maxPerSource: 2,
    timedOnly: true,
  }).map(compactEvent);

  const upcoming = dedupeEvents(data.events)
    .filter(
      (e) =>
        !isHsAthleticsEventSource(e.source_id) &&
        eventInUpcomingWindow(e, at, {
          horizonMs: EVENTS_HORIZON_DAYS * 24 * 60 * 60 * 1000,
        }) &&
        !isCivicEvent(e, data.sources) &&
        !looksLikeLowValueListing(e.title),
    )
    .map(compactEvent);

  return {
    v: 1,
    captured_at: at.toISOString(),
    featured,
    upcoming,
  };
}

export function buildCivicSnapshot(
  data: AppData,
  at = new Date(),
): PublicCivicSnapshot {
  return {
    v: 1,
    captured_at: at.toISOString(),
    events: selectCivicUpcoming(
      data.events,
      data.sources,
      at.getTime(),
    ).map(compactEvent),
  };
}

export function buildSportsSnapshot(
  data: AppData,
  at = new Date(),
): PublicSportsSnapshot {
  const weekGames = selectThisWeekAthletics(data.athletics ?? [], at);
  const all = selectSportsStories(data.stories, data.sources, { limit: 40 });
  const seen = new Set<string>();
  const stories: PublicSportsStoryCard[] = [];
  for (const item of all) {
    const key = item.title.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    stories.push({
      id: item.id,
      title: item.title,
      url: item.url,
      published_at: item.published_at,
      source_id: item.source_id,
      source_name: item.source_name,
      beat_id: item.beat_id,
    });
  }
  return {
    v: 1,
    captured_at: at.toISOString(),
    weekGames,
    stories,
  };
}

export function buildEmailSnapshot(
  data: AppData,
  at = new Date(),
): PublicEmailSnapshot {
  return {
    v: 1,
    captured_at: at.toISOString(),
    letter: buildEmailEditionSnapshot(data, at),
  };
}

export function buildAlertsSnapshot(
  data: AppData,
  at = new Date(),
): PublicAlertsSnapshot {
  return {
    v: 1,
    captured_at: at.toISOString(),
    alerts: selectAlerts(data.stories, data.sources, { limit: 3 }).map(toAlert),
  };
}

export function buildEditionsSnapshot(
  data: AppData,
  at = new Date(),
): PublicEditionsSnapshot {
  const editions = [...(data.editions ?? [])].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  return { v: 1, captured_at: at.toISOString(), editions };
}

export function buildEmailArchiveSnapshot(
  data: AppData,
  at = new Date(),
): PublicEmailArchiveSnapshot {
  const letters = [...(data.email_editions ?? [])].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  return { v: 1, captured_at: at.toISOString(), letters };
}

export function buildOriginalsSnapshot(
  data: AppData,
  at = new Date(),
): PublicOriginalsSnapshot {
  const bySlug: Record<string, PublicOriginalCard> = {};
  for (const story of data.stories) {
    if (!story.is_original) continue;
    const slug = story.slug?.trim();
    if (!slug || isBannedOriginalSlug(slug)) continue;
    bySlug[slug] = {
      id: story.id,
      slug,
      title: story.title,
      dek: story.dek,
      body: story.body,
      url: story.url,
      published_at: story.published_at,
      byline: PUBLIC_ORIGINAL_BYLINE,
      image_url: story.image_url,
      image_credit: story.image_credit ?? null,
      image_caption: story.image_caption ?? null,
      source_urls: story.source_urls ?? [],
      section: storySectionLabel(story, data.sources, data.beats),
    };
  }
  return { v: 1, captured_at: at.toISOString(), bySlug };
}

/** Build every public snapshot from an in-memory store (no KV reads). */
export function buildAllPublicSnapshots(data: AppData, at = new Date()) {
  return {
    home: buildHomeSnapshot(data, at),
    schools: buildSchoolsSnapshot(data, at),
    events: buildEventsSnapshot(data, at),
    civic: buildCivicSnapshot(data, at),
    sports: buildSportsSnapshot(data, at),
    email: buildEmailSnapshot(data, at),
    alerts: buildAlertsSnapshot(data, at),
    editions: buildEditionsSnapshot(data, at),
    emailArchive: buildEmailArchiveSnapshot(data, at),
    originals: buildOriginalsSnapshot(data, at),
  };
}

let writing = false;

/** Per-isolate cache so warm Workers skip repeat KV gets within the isolate. */
const memSnapshots = new Map<string, unknown>();

function rememberAll(
  all: ReturnType<typeof buildAllPublicSnapshots>,
): void {
  memSnapshots.set(PUBLIC_KEYS.home, all.home);
  memSnapshots.set(PUBLIC_KEYS.schools, all.schools);
  memSnapshots.set(PUBLIC_KEYS.events, all.events);
  memSnapshots.set(PUBLIC_KEYS.civic, all.civic);
  memSnapshots.set(PUBLIC_KEYS.sports, all.sports);
  memSnapshots.set(PUBLIC_KEYS.email, all.email);
  memSnapshots.set(PUBLIC_KEYS.alerts, all.alerts);
  memSnapshots.set(PUBLIC_KEYS.editions, all.editions);
  memSnapshots.set(PUBLIC_KEYS.emailArchive, all.emailArchive);
  memSnapshots.set(PUBLIC_KEYS.originals, all.originals);
}

/**
 * Persist all public snapshots + warm the sitemap cache.
 * Call after desk/cron mutations (via saveStore). Uses the data already in hand.
 */
export async function writeAllPublicSnapshots(data: AppData): Promise<void> {
  if (writing) return;
  writing = true;
  try {
    const at = new Date();
    const all = buildAllPublicSnapshots(data, at);
    rememberAll(all);

    const kv = await getTraverseDataKv();
    if (!kv) return;

    const puts: Array<Promise<void>> = [
      kv.put(PUBLIC_KEYS.home, JSON.stringify(all.home)),
      kv.put(PUBLIC_KEYS.schools, JSON.stringify(all.schools)),
      kv.put(PUBLIC_KEYS.events, JSON.stringify(all.events)),
      kv.put(PUBLIC_KEYS.civic, JSON.stringify(all.civic)),
      kv.put(PUBLIC_KEYS.sports, JSON.stringify(all.sports)),
      kv.put(PUBLIC_KEYS.email, JSON.stringify(all.email)),
      kv.put(PUBLIC_KEYS.alerts, JSON.stringify(all.alerts)),
      kv.put(PUBLIC_KEYS.editions, JSON.stringify(all.editions)),
      kv.put(PUBLIC_KEYS.emailArchive, JSON.stringify(all.emailArchive)),
      kv.put(PUBLIC_KEYS.originals, JSON.stringify(all.originals)),
      kv.put(
        SITEMAP_CACHE_KEY,
        buildSitemapXml({
          stories: data.stories,
          editions: data.editions,
          email_editions: data.email_editions,
        }),
        { expirationTtl: SITEMAP_TTL_SECONDS },
      ),
    ];
    await Promise.all(puts);
  } finally {
    writing = false;
  }
}

async function readJsonKey<T>(key: string): Promise<T | null> {
  const kv = await getTraverseDataKv();
  if (!kv) return null;
  try {
    const raw = await kv.get(key, "text");
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Read one public snapshot. On miss: load the store once, rebuild all
 * snapshots, return the requested one. Never N+1.
 */
export async function readPublicSnapshot<T>(
  key: PublicSnapshotKey,
  pick: (all: ReturnType<typeof buildAllPublicSnapshots>) => T,
): Promise<T> {
  const fromMem = memSnapshots.get(key);
  if (fromMem !== undefined) return fromMem as T;

  const cached = await readJsonKey<T>(key);
  if (cached) {
    memSnapshots.set(key, cached);
    return cached;
  }

  // Cold / missing: one store load + rebuild everything, then return.
  const { loadStore } = await import("@/lib/data/store");
  const data = await loadStore();
  // Scrub-on-load may have already rebuilt via saveStore.
  const afterLoad = memSnapshots.get(key);
  if (afterLoad !== undefined) return afterLoad as T;

  const all = buildAllPublicSnapshots(data);
  rememberAll(all);
  await writeAllPublicSnapshots(data);
  return pick(all);
}

/** Request-deduped: interior rail + homepage + story “also” share one get. */
export const getHomeSnapshot = cache(async (): Promise<PublicHomeSnapshot> => {
  return readPublicSnapshot(PUBLIC_KEYS.home, (a) => a.home);
});

export async function getSchoolsSnapshot(): Promise<PublicSchoolsSnapshot> {
  return readPublicSnapshot(PUBLIC_KEYS.schools, (a) => a.schools);
}

export async function getEventsSnapshot(): Promise<PublicEventsSnapshot> {
  return readPublicSnapshot(PUBLIC_KEYS.events, (a) => a.events);
}

export async function getCivicSnapshot(): Promise<PublicCivicSnapshot> {
  return readPublicSnapshot(PUBLIC_KEYS.civic, (a) => a.civic);
}

export async function getSportsSnapshot(): Promise<PublicSportsSnapshot> {
  return readPublicSnapshot(PUBLIC_KEYS.sports, (a) => a.sports);
}

export async function getEmailSnapshot(): Promise<PublicEmailSnapshot> {
  return readPublicSnapshot(PUBLIC_KEYS.email, (a) => a.email);
}

export async function getAlertsSnapshot(): Promise<PublicAlertsSnapshot> {
  return readPublicSnapshot(PUBLIC_KEYS.alerts, (a) => a.alerts);
}

export async function getEditionsSnapshot(): Promise<PublicEditionsSnapshot> {
  return readPublicSnapshot(PUBLIC_KEYS.editions, (a) => a.editions);
}

export async function getEmailArchiveSnapshot(): Promise<PublicEmailArchiveSnapshot> {
  return readPublicSnapshot(PUBLIC_KEYS.emailArchive, (a) => a.emailArchive);
}

export async function getOriginalsSnapshot(): Promise<PublicOriginalsSnapshot> {
  return readPublicSnapshot(PUBLIC_KEYS.originals, (a) => a.originals);
}

/**
 * Shared interior rail + story “also covered” from the home snapshot.
 * One well-known key — never list() or per-item gets on GET.
 */
export function homeRailFromSnapshot(home: PublicHomeSnapshot) {
  return {
    alerts: home.alerts,
    civic: home.civic.slice(0, 5),
    tonight: home.weekendEvents.slice(0, 4),
    also: home.around.slice(0, 5) as ClusteredStory[],
  };
}
