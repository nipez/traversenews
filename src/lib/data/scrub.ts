import type { AppData, EditionSnapshot, EditionStoryCard, Story } from "@/lib/types";
import { sanitizeStoredAthletics } from "@/lib/athletics";
import { sanitizeStoredSchools } from "@/lib/schools";
import { sanitizeStoredEvents } from "@/lib/events";

/** Invented seed copy that must never appear as reporting. See README → Editorial. */
export const BANNED_ORIGINAL_SLUGS = new Set([
  "center-road-fix-list",
  "boardman-overnight-parking",
  "food-wine-last-days",
  "bata-alert-cutover",
]);

export const BANNED_STORY_IDS = new Set([
  "story_center_road",
  "story_boardman",
  "story_food_wine",
  "story_bata_cutover",
  "story_seed_bat",
  "story_seed_bat_ticker",
  "story_seed_crash",
  "story_seed_ipr",
  "story_seed_hub",
  "story_seed_detour",
  "story_seed_more_1",
  "story_seed_more_2",
  "story_seed_more_3",
]);

/** Invented seed calendar rows that were never from ICS. */
export const BANNED_EVENT_IDS = new Set([
  "evt_foodwine",
  "evt_film",
  "evt_writers",
  "evt_city_study",
  "evt_road_comm",
  "evt_tcaps_board",
]);

/** Known invented titles (seed + archive cards) — match case-insensitive substring.
 * Keep these specific to fake seed copy — do not ban real Center Road / Peninsula reporting. */
const BANNED_TITLE_MARKERS = [
  "center road still on the fix list",
  "six years on the fix list",
  "boardman overnight",
  "food & wine",
  "food and wine",
  "bata alert cutover",
  "tcaps hub",
  "organizers say saturday night tastings",
];

const OUTLET_HOMEPAGES = new Set([
  "https://www.9and10news.com/",
  "https://www.9and10news.com",
  "https://www.traverseticker.com/",
  "https://www.traverseticker.com",
  "https://www.record-eagle.com/",
  "https://www.record-eagle.com",
  "https://www.interlochenpublicradio.org/",
  "https://www.interlochenpublicradio.org",
  "https://www.northernexpress.com/",
  "https://www.northernexpress.com",
]);

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/$/, "");
}

function titleLooksInvented(title: string): boolean {
  const t = title.toLowerCase();
  return BANNED_TITLE_MARKERS.some((m) => t.includes(m));
}

export function isInventedStory(story: {
  id: string;
  is_original: boolean;
  slug: string | null;
  url: string;
  title?: string;
}): boolean {
  if (BANNED_STORY_IDS.has(story.id)) return true;
  if (story.is_original && story.slug && BANNED_ORIGINAL_SLUGS.has(story.slug)) {
    return true;
  }
  if (story.title && titleLooksInvented(story.title)) return true;
  if (!story.is_original) {
    const u = normalizeUrl(story.url);
    if (OUTLET_HOMEPAGES.has(u) || OUTLET_HOMEPAGES.has(`${u}/`)) return true;
  }
  return false;
}

export function isInventedEditionCard(card: EditionStoryCard): boolean {
  if (card.slug && BANNED_ORIGINAL_SLUGS.has(card.slug)) return true;
  if (titleLooksInvented(card.title)) return true;
  if (card.is_original && card.slug && BANNED_ORIGINAL_SLUGS.has(card.slug)) {
    return true;
  }
  // Fake "originals" sometimes archived without slug match — drop any original
  // that still carries banned title markers (handled above) or points at /story/
  // banned paths.
  if (card.url.includes("/story/")) {
    const slug = card.url.split("/story/")[1]?.split(/[?#]/)[0];
    if (slug && BANNED_ORIGINAL_SLUGS.has(slug)) return true;
  }
  if (!card.is_original) {
    const u = normalizeUrl(card.url);
    if (OUTLET_HOMEPAGES.has(u) || OUTLET_HOMEPAGES.has(`${u}/`)) return true;
  }
  return false;
}

/**
 * Strip invented originals and fake wire cards from live store + edition archive.
 * Returns whether anything was removed so callers can persist.
 */
export function scrubAppData(data: AppData): { data: AppData; changed: boolean } {
  let changed = false;
  const nextStories = data.stories.filter((s) => !isInventedStory(s));
  if (nextStories.length !== data.stories.length) {
    changed = true;
    data.stories = nextStories;
  }

  const filtered = data.events.filter((e) => !BANNED_EVENT_IDS.has(e.id));
  const sanitized = sanitizeStoredEvents(filtered);
  const nextEvents = sanitized.events;
  const beforeIds = data.events.map((e) => e.id).sort().join(",");
  const afterIds = nextEvents.map((e) => e.id).sort().join(",");
  if (beforeIds !== afterIds || sanitized.changed) {
    changed = true;
    data.events = nextEvents;
  } else {
    data.events = nextEvents;
  }

  if (!Array.isArray(data.athletics)) {
    data.athletics = [];
    changed = true;
  } else {
    const ath = sanitizeStoredAthletics(data.athletics);
    if (ath.changed) {
      changed = true;
      data.athletics = ath.games;
    } else {
      data.athletics = ath.games;
    }
  }

  if (!Array.isArray(data.schools)) {
    data.schools = [];
    changed = true;
  } else {
    const sch = sanitizeStoredSchools(data.schools);
    if (sch.changed) {
      changed = true;
      data.schools = sch.items;
    } else {
      data.schools = sch.items;
    }
  }

  if (!Array.isArray(data.email_editions)) {
    data.email_editions = [];
    changed = true;
  }

  data.editions = data.editions.map((ed) => {
    const scrubbed = scrubEdition(ed);
    if (scrubbed.changed) changed = true;
    return scrubbed.edition;
  });

  return { data, changed };
}

function eventCardLooksInvented(title: string): boolean {
  const t = title.toLowerCase();
  return (
    t.includes("food & wine") ||
    t.includes("food and wine") ||
    t.includes("open-air film at clinch") ||
    t.includes("national writers series: evening conversation")
  );
}

function dedupeEditionEventCards(
  cards: EditionSnapshot["events"],
): EditionSnapshot["events"] {
  const byKey = new Map<string, EditionSnapshot["events"][number]>();
  for (const card of cards) {
    const key = [
      card.title.trim().toLowerCase(),
      card.starts_at.slice(0, 16),
      card.place.trim().toLowerCase(),
    ].join("|");
    if (!byKey.has(key)) byKey.set(key, card);
  }
  return Array.from(byKey.values());
}

function scrubEdition(edition: EditionSnapshot): {
  edition: EditionSnapshot;
  changed: boolean;
} {
  let changed = false;
  const hadInventedLead = Boolean(
    edition.lead && isInventedEditionCard(edition.lead),
  );
  let lead = edition.lead;
  if (hadInventedLead) {
    lead = null;
    changed = true;
  }

  let around = edition.around.filter((c) => !isInventedEditionCard(c));
  if (around.length !== edition.around.length) changed = true;

  // After dropping an invented lead, promote the first remaining real wire card.
  if (!lead && around.length > 0 && hadInventedLead) {
    lead = { ...around[0], is_original: false };
    around = around.slice(1);
    changed = true;
  }

  const events = dedupeEditionEventCards(
    edition.events.filter((e) => !eventCardLooksInvented(e.title)),
  );
  const civic = dedupeEditionEventCards(
    edition.civic.filter((e) => !eventCardLooksInvented(e.title)),
  );
  if (events.length !== edition.events.length || civic.length !== edition.civic.length) {
    changed = true;
  }

  if (!changed) return { edition, changed: false };
  return {
    changed: true,
    edition: { ...edition, lead, around, events, civic },
  };
}

export function isBannedOriginalSlug(slug: string | null | undefined): boolean {
  return Boolean(slug && BANNED_ORIGINAL_SLUGS.has(slug));
}

export function keepRealOriginals(stories: Story[]): Story[] {
  return stories.filter((s) => s.is_original && !isInventedStory(s));
}
