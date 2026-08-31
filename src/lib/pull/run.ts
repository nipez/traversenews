import {
  listStories,
  loadStore,
  replacePulledEvents,
  replacePulledStories,
  replaceSchoolCalendarItems,
  replaceShowListings,
  saveStore,
  snapshotTodaysEdition,
  withSkippedPublicSnapshots,
} from "@/lib/data/store";
import { isInventedStory, keepRealOriginals } from "@/lib/data/scrub";
import { pullAnnArborHtml, pullAnnArborNews } from "@/lib/pull/html-ann-arbor";
import { pullHtmlEvents } from "@/lib/pull/html-events";
import { pullHtmlShows } from "@/lib/pull/html-shows";
import { pullIcsSource } from "@/lib/pull/ics";
import { pullRssSource } from "@/lib/pull/rss";
import { schoolItemsFromEvents } from "@/lib/schools";
import { isSchoolCalSource } from "@/lib/source-lanes";
import type { EventItem, SchoolCalendarItem, ShowListing, Story } from "@/lib/types";

export type PullResult = {
  ok: boolean;
  storiesAdded: number;
  eventsAdded: number;
  showsAdded: number;
  errors: Array<{ source: string; error: string }>;
  last_pull_at: string;
  persisted: "kv" | "file" | "memory";
  edition_date: string | null;
  /** Morning-email letter date when capture succeeded (null if skipped). */
  email_date: string | null;
};

/** Sources whose HTML listing pages we can turn into EventItems. */
const HTML_EVENT_SOURCE_IDS = new Set([
  "src_interlochen",
  "src_tadl",
  "src_visit_events",
]);

/** Ann Arbor listings the Worker can read (Legistar / Ark / UMS). */
const HTML_AA_LISTING_IDS = new Set([
  "src_a2_legistar",
  "src_ark_events",
  "src_ums_events",
  "src_marquee_events",
]);

/** Official HTML newsrooms the Worker can read (headline + link only). */
const HTML_AA_NEWS_IDS = new Set(["src_a2_news"]);

/** Shows venues with static HTML showtimes the Worker can read. */
const HTML_SHOW_SOURCE_IDS = new Set([
  "src_state_theatre",
  "src_elk_cinema",
  "src_alluvion",
  "src_marquee_shows",
]);

export async function runPull(): Promise<PullResult> {
  return withSkippedPublicSnapshots(async () => {
    const result = await runPullInner();
    // One snapshot rebuild after the whole pull (not per intermediate save).
    try {
      const store = await loadStore();
      const { writeAllPublicSnapshots } = await import("@/lib/public-snapshots");
      await writeAllPublicSnapshots(store);
    } catch {
      // Best-effort — pull already persisted app_data.
    }
    return result;
  });
}

async function runPullInner(): Promise<PullResult> {
  const data = await loadStore();
  const enabled = data.sources.filter((s) => s.enabled);
  const errors: Array<{ source: string; error: string }> = [];
  const pulledStories: Story[] = [];
  const pulledEvents: EventItem[] = [];
  const pulledShows: ShowListing[] = [];
  const pulledSchools: SchoolCalendarItem[] = [];
  const pulledAt = new Date().toISOString();
  const touch = new Map<
    string,
    { ok: boolean; error: string | null; attempted: boolean }
  >();

  for (const source of enabled) {
    try {
      if (source.pull_method === "rss") {
        const items = await pullRssSource(source);
        pulledStories.push(...items);
        touch.set(source.id, { ok: true, error: null, attempted: true });
      } else if (source.pull_method === "ics") {
        const items = await pullIcsSource(source);
        if (isSchoolCalSource(source, source.id)) {
          pulledSchools.push(...schoolItemsFromEvents(items));
        } else {
          pulledEvents.push(...items);
        }
        touch.set(source.id, { ok: true, error: null, attempted: true });
      } else if (
        source.pull_method === "html" &&
        HTML_SHOW_SOURCE_IDS.has(source.id)
      ) {
        const htmlResult = await pullHtmlShows(source);
        pulledShows.push(...htmlResult.shows);
        if (htmlResult.bot_blocked) {
          const msg =
            `Bot-blocked or empty Shows page (${htmlResult.status ?? "n/a"}). ` +
            "Do not invent showtimes. Need Traverse News to pull this URL on the live computer " +
            "and POST the list to /api/desk/shows/import.";
          errors.push({ source: source.name, error: msg });
          touch.set(source.id, { ok: false, error: msg, attempted: true });
        } else if (htmlResult.error) {
          errors.push({ source: source.name, error: htmlResult.error });
          touch.set(source.id, {
            ok: false,
            error: htmlResult.error,
            attempted: true,
          });
        } else {
          touch.set(source.id, { ok: true, error: null, attempted: true });
        }
      } else if (
        source.pull_method === "html" &&
        HTML_AA_NEWS_IDS.has(source.id)
      ) {
        const htmlResult = await pullAnnArborNews(source);
        pulledStories.push(...htmlResult.stories);
        if (htmlResult.bot_blocked) {
          const msg =
            `Bot-blocked or empty newsroom (${htmlResult.status ?? "n/a"}). ` +
            "Do not invent headlines. Need Traverse News to pull this URL on the live computer " +
            "and POST /api/desk/stories/import.";
          errors.push({ source: source.name, error: msg });
          touch.set(source.id, { ok: false, error: msg, attempted: true });
        } else {
          touch.set(source.id, { ok: true, error: null, attempted: true });
        }
      } else if (
        source.pull_method === "html" &&
        HTML_AA_LISTING_IDS.has(source.id)
      ) {
        const htmlResult = await pullAnnArborHtml(source);
        pulledEvents.push(...htmlResult.events);
        if (htmlResult.bot_blocked) {
          const msg =
            `Bot-blocked or empty listing (${htmlResult.status ?? "n/a"}). ` +
            "Do not invent events. Need Traverse News to pull this URL on the live computer " +
            "and POST the list to the matching /api/desk/*/import route.";
          errors.push({ source: source.name, error: msg });
          touch.set(source.id, { ok: false, error: msg, attempted: true });
        } else {
          touch.set(source.id, { ok: true, error: null, attempted: true });
        }
      } else if (
        source.pull_method === "html" &&
        HTML_EVENT_SOURCE_IDS.has(source.id)
      ) {
        const htmlResult = await pullHtmlEvents(source);
        pulledEvents.push(...htmlResult.events);
        if (htmlResult.bot_blocked) {
          const msg =
            `Bot-blocked or empty JS calendar (${htmlResult.status ?? "n/a"}). ` +
            "Do not invent events. Need Traverse News to pull this URL on the live computer " +
            "and POST the list to /api/desk/events/import " +
            `(first source: https://www.traversecity.com/events/, source_id src_visit_events).`;
          errors.push({ source: source.name, error: msg });
          touch.set(source.id, { ok: false, error: msg, attempted: true });
        } else {
          touch.set(source.id, { ok: true, error: null, attempted: true });
        }
      } else if (
        source.pull_method === "html" ||
        source.pull_method === "facebook" ||
        source.pull_method === "none" ||
        source.pull_method === "original"
      ) {
        const hint =
          source.pull_method === "original"
            ? "Staff originals — Desk publish only."
            : source.beat_id === "beat_shows"
              ? "Worker does not scrape this Shows venue. Traverse News pulls on the box → POST /api/desk/shows/import."
              : `Worker does not scrape ${source.pull_method}. Traverse News pulls on the box and POSTs the matching /api/desk/*/import route.`;
        touch.set(source.id, {
          ok: true,
          error: hint,
          attempted: false,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown pull error";
      errors.push({ source: source.name, error: msg });
      touch.set(source.id, { ok: false, error: msg, attempted: true });
    }
  }

  const existing = await listStories();
  // Never carry invented "originals" or fake wire placeholders across a pull.
  const originals = keepRealOriginals(existing);

  // RSS pull only replaces rows for sources we actually fetched this run —
  // keep browser-imported Facebook alerts (src_gt911, src_ticker_fb, etc.) intact.
  const nextAggregated =
    pulledStories.length > 0
      ? (() => {
          const pulledIds = new Set(pulledStories.map((s) => s.source_id));
          const preserved = existing.filter(
            (s) =>
              !s.is_original &&
              !isInventedStory(s) &&
              !pulledIds.has(s.source_id),
          );
          return [...preserved, ...pulledStories];
        })()
      : existing.filter((s) => !s.is_original && !isInventedStory(s));

  await replacePulledStories(originals, nextAggregated);
  if (pulledEvents.length > 0) {
    const icsSourceIds = [
      ...new Set(pulledEvents.map((e) => e.source_id)),
    ];
    await replacePulledEvents(pulledEvents, icsSourceIds);
  }
  if (pulledSchools.length > 0) {
    const schoolSourceIds = [
      ...new Set(pulledSchools.map((s) => s.source_id)),
    ];
    await replaceSchoolCalendarItems(pulledSchools, schoolSourceIds);
  }
  if (pulledShows.length > 0) {
    const showSourceIds = [...new Set(pulledShows.map((s) => s.source_id))];
    await replaceShowListings(pulledShows, showSourceIds);
  }

  const store = await loadStore();
  store.last_pull_at = pulledAt;
  for (const source of store.sources) {
    const t = touch.get(source.id);
    if (!t) continue;
    if (t.attempted) {
      source.last_pulled_at = pulledAt;
    }
    source.last_pull_error = t.error;
  }
  await saveStore(store);

  const edition = await snapshotTodaysEdition(new Date());
  let email_date: string | null = null;
  try {
    const { snapshotTodaysEmailEdition } = await import("@/lib/data/store");
    const letter = await snapshotTodaysEmailEdition(new Date());
    email_date = letter.date;
  } catch {
    // Letter capture is best-effort — never fail the pull over archive write.
  }

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
    showsAdded: pulledShows.length,
    errors,
    last_pull_at: store.last_pull_at ?? pulledAt,
    persisted,
    edition_date: edition.date,
    email_date,
  };
}
