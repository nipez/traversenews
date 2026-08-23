import { isAlertSourceId } from "@/lib/alerts";
import { selectThisWeekAthletics } from "@/lib/athletics";
import { detroitDayKey } from "@/lib/dates";
import {
  dedupeEvents,
  isCivicEvent,
  isHsAthleticsEventSource,
} from "@/lib/events";
import { selectUpcomingSchoolDays } from "@/lib/schools";
import type {
  AppData,
  AthleticsGame,
  EventItem,
  SchoolCalendarItem,
  Story,
} from "@/lib/types";

export type SearchHit = {
  id: string;
  title: string;
  dek: string;
  href: string;
  meta?: string;
  external: boolean;
};

export type SearchResults = {
  q: string;
  stories: SearchHit[];
  events: SearchHit[];
  civic: SearchHit[];
  schools: SearchHit[];
  sports: SearchHit[];
  alerts: SearchHit[];
};

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function matches(haystack: string, q: string): boolean {
  if (!q) return false;
  return norm(haystack).includes(q);
}

function storyHref(story: Story): { href: string; external: boolean } {
  if (story.is_original && story.slug) {
    return { href: `/story/${story.slug}`, external: false };
  }
  return { href: story.url, external: true };
}

/** Canonical URL when present; else title + source + place. */
export function eventSearchCollapseKey(event: EventItem): string {
  const url = (event.url ?? "").trim().toLowerCase().replace(/\/+$/, "");
  if (url) return `url:${url}`;
  return `tps:${norm(event.title)}|${event.source_id}|${norm(event.place)}`;
}

/** Short remaining-date label, e.g. "Aug 23". Never invents a clock. */
function formatSearchEventDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Detroit",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

/**
 * Collapse recurring listings that share a URL (or title+source+place)
 * into one hit; dek lists remaining dates (no invented times).
 */
export function collapseEventSearchHits(
  matched: EventItem[],
  sourceName: (id: string) => string,
  now = new Date(),
): SearchHit[] {
  const groups = new Map<string, EventItem[]>();
  for (const event of matched) {
    const key = eventSearchCollapseKey(event);
    const list = groups.get(key) ?? [];
    list.push(event);
    groups.set(key, list);
  }

  const todayKey = detroitDayKey(now);
  const hits: SearchHit[] = [];

  for (const group of groups.values()) {
    group.sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    );
    const primary = group[0];

    let dated = group.filter((e) => detroitDayKey(e.starts_at) >= todayKey);
    if (dated.length === 0) dated = group;

    const dateLabels: string[] = [];
    const seenDays = new Set<string>();
    for (const e of dated) {
      const day = detroitDayKey(e.starts_at);
      if (seenDays.has(day)) continue;
      seenDays.add(day);
      dateLabels.push(formatSearchEventDate(e.starts_at));
    }

    const place = primary.place?.trim() || "";
    const dates = dateLabels.join(", ");
    const dek = [place, dates].filter(Boolean).join(" · ");

    hits.push({
      id: primary.id,
      title: primary.title,
      dek,
      href: primary.url || "/whats-on",
      meta: sourceName(primary.source_id) || undefined,
      external: Boolean(primary.url),
    });
  }

  return hits;
}

/**
 * Search live AppData only (titles, deks, places). Case-insensitive.
 * Never invents hits. Never scrapes Visit TC at query time.
 */
export function searchAppData(data: AppData, rawQuery: string): SearchResults {
  const q = norm(rawQuery);
  const empty: SearchResults = {
    q: rawQuery.trim(),
    stories: [],
    events: [],
    civic: [],
    schools: [],
    sports: [],
    alerts: [],
  };
  if (!q || q.length < 2) return empty;

  const sourceName = (id: string) =>
    data.sources.find((s) => s.id === id)?.name ?? "";

  const stories: SearchHit[] = [];
  const alerts: SearchHit[] = [];

  for (const story of data.stories) {
    const title = story.title ?? "";
    const dek = story.dek ?? "";
    if (!matches(title, q) && !matches(dek, q)) continue;

    const { href, external } = storyHref(story);
    const hit: SearchHit = {
      id: story.id,
      title,
      dek,
      href,
      meta:
        sourceName(story.source_id) ||
        (story.is_original ? "traverse.news" : undefined),
      external,
    };

    if (!story.is_original && isAlertSourceId(story.source_id)) {
      alerts.push(hit);
    } else {
      // Originals + Around the bay wire (not inventing; only stored rows).
      stories.push(hit);
    }
  }

  const eventMatches: EventItem[] = [];
  const civicMatches: EventItem[] = [];
  for (const event of dedupeEvents(data.events)) {
    if (isHsAthleticsEventSource(event.source_id)) continue;
    const title = event.title ?? "";
    const place = event.place ?? "";
    if (!matches(title, q) && !matches(place, q)) continue;

    if (isCivicEvent(event, data.sources)) civicMatches.push(event);
    else eventMatches.push(event);
  }

  const events = collapseEventSearchHits(eventMatches, sourceName);
  const civic = collapseEventSearchHits(civicMatches, sourceName);

  const schools: SearchHit[] = [];
  for (const item of selectUpcomingSchoolDays(data.schools ?? [])) {
    const title = item.title ?? "";
    const place = item.place ?? "";
    const district = item.district ?? "";
    if (!matches(title, q) && !matches(place, q) && !matches(district, q)) {
      continue;
    }
    schools.push(schoolHit(item));
  }

  const sports: SearchHit[] = [];
  for (const game of selectThisWeekAthletics(data.athletics ?? [])) {
    const title = game.title ?? "";
    const place = game.place ?? "";
    const school = game.school ?? "";
    if (!matches(title, q) && !matches(place, q) && !matches(school, q)) {
      continue;
    }
    sports.push(sportsHit(game));
  }

  return {
    q: rawQuery.trim(),
    stories: stories.slice(0, 40),
    events: events.slice(0, 40),
    civic: civic.slice(0, 40),
    schools: schools.slice(0, 40),
    sports: sports.slice(0, 40),
    alerts: alerts.slice(0, 20),
  };
}

function schoolHit(item: SchoolCalendarItem): SearchHit {
  return {
    id: item.id,
    title: item.title,
    dek: [item.district, item.place].filter(Boolean).join(" · "),
    href: item.url || "/schools",
    meta: item.district,
    external: Boolean(item.url),
  };
}

function sportsHit(game: AthleticsGame): SearchHit {
  return {
    id: game.id,
    title: game.title,
    dek: [game.school, game.place].filter(Boolean).join(" · "),
    href: game.url || "/sports",
    meta: game.school,
    external: Boolean(game.url),
  };
}

export function searchHasAny(results: SearchResults): boolean {
  return (
    results.stories.length +
      results.events.length +
      results.civic.length +
      results.schools.length +
      results.sports.length +
      results.alerts.length >
    0
  );
}
