import { isAlertSourceId } from "@/lib/alerts";
import { selectThisWeekAthletics } from "@/lib/athletics";
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
      meta: sourceName(story.source_id) || (story.is_original ? "traverse.news" : undefined),
      external,
    };

    if (!story.is_original && isAlertSourceId(story.source_id)) {
      alerts.push(hit);
    } else {
      // Originals + Around the bay wire (not inventing; only stored rows).
      stories.push(hit);
    }
  }

  const events: SearchHit[] = [];
  const civic: SearchHit[] = [];
  for (const event of dedupeEvents(data.events)) {
    if (isHsAthleticsEventSource(event.source_id)) continue;
    const title = event.title ?? "";
    const place = event.place ?? "";
    if (!matches(title, q) && !matches(place, q)) continue;

    const hit = eventHit(event, sourceName(event.source_id));
    if (isCivicEvent(event, data.sources)) civic.push(hit);
    else events.push(hit);
  }

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

function eventHit(event: EventItem, source: string): SearchHit {
  return {
    id: event.id,
    title: event.title,
    dek: event.place || "",
    href: event.url || "/whats-on",
    meta: source || undefined,
    external: Boolean(event.url),
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
