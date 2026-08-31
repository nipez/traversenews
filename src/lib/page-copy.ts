/**
 * Desk-editable static page copy (Events dek, About essay, …).
 * Defaults match the shipped hardcoded text so empty KV looks the same.
 * Links use markdown: [Civic](/civic). Headings: ## Why this exists
 */

import { getSite } from "@/lib/sites";
import type { PageCopy } from "@/lib/types";

export type { PageCopy };

export const DEFAULT_EVENTS_DEK =
  "Concerts, festivals, markets, library programs. Meetings live on [Civic](/civic). Something missing? [Let us know](#event-tip)";

export const DEFAULT_ABOUT_TITLE = "About traverse.news";

export const DEFAULT_ABOUT_DEK =
  "A Traverse City desk. One place to read the bay.";

export const DEFAULT_ABOUT_BODY = `## Why this exists

Traverse City does not have a shortage of information. It has a shortage of one place to put it.

If you want to know what happened, what's tonight, and who is meeting on Tuesday, you still have to open the Record-Eagle, the Ticker, TCBN, Northern Express, IPR, 9&10, Visit TC, CivicWeb, the library, Interlochen, Facebook groups, and a stack of org calendars. Most people do not. They miss the meeting, the detour, and the show.

traverse.news exists so you do not have to do that circuit. One site. The original story when we have one. Everyone else's headline when they have one. The night out. The civic calendar. The alert when the road is closed.

That is the whole vision: be the one tab that covers Traverse City and the towns around the bay.

## What you will find

**Today** is the paper. A traverse.news original leads when we have published one. Under that, Around the bay is other desks — Record-Eagle, the Ticker, IPR, 9&10, Northern Express, and local orgs.

[Events](/events) is concerts, markets, library programs, and nights out. [Civic](/civic) is boards and government only. [Schools](/schools) is important district dates — calendars you can trust, not every bake sale. [Sports](/sports) is area games and sports headlines. [Shows](/shows) is movies and live theatre. [Local](/local) is useful outbound directories: where to look when you need a number, a map, or an office. We pull from public listings. If a source does not print a time, we leave it blank.

[Alerts](/#alerts) is official only: crashes, outages, closures, and warnings.

**Morning email** is the same paper in your inbox. One pass before the day starts.

## How we write

Original reporting on this site is traverse.news reporting. We do not invent people, quotes, crashes, or events. If a sentence came from another outlet, we say so and we link it.

When a story is a synthesis of the local record, the article ends with those permalinks. That is the paper trail, not a reprint.

## What we will not do

We will not scrape a paywall and paste the body. Record-Eagle and anyone else with a wall stay as headline, dek, and a link.

We will not dump group-chat accusations onto the homepage. Complaint pile-ons, doxxing, and unverified claims stay off the public site.

We will not publish a calendar item we cannot point back to.`;

export function emptyPageCopy(): PageCopy {
  return {
    events_dek: "",
    about_title: "",
    about_dek: "",
    about_body: "",
    updated_at: null,
  };
}

export function defaultPageCopy(): PageCopy {
  const copy = getSite().pageCopy;
  return {
    events_dek: copy.eventsDek,
    about_title: copy.aboutTitle,
    about_dek: copy.aboutDek,
    about_body: copy.aboutBody,
    updated_at: null,
  };
}

/** Merge Desk KV over defaults; blank strings fall back to shipped copy. */
export function resolvePageCopy(
  raw: Partial<PageCopy> | null | undefined,
): PageCopy {
  const d = defaultPageCopy();
  if (!raw || typeof raw !== "object") return d;
  return {
    events_dek: raw.events_dek?.trim() || d.events_dek,
    about_title: raw.about_title?.trim() || d.about_title,
    about_dek: raw.about_dek?.trim() || d.about_dek,
    about_body: raw.about_body?.trim() || d.about_body,
    updated_at:
      typeof raw.updated_at === "string" && raw.updated_at
        ? raw.updated_at
        : null,
  };
}

/** Normalize a Desk save payload (allow blank = reset that field to default). */
export function normalizePageCopyInput(
  body: Partial<PageCopy> | null | undefined,
  previous?: Partial<PageCopy> | null,
): PageCopy {
  const prev = previous && typeof previous === "object" ? previous : {};
  const pick = (key: keyof Omit<PageCopy, "updated_at">): string => {
    if (body && typeof body[key] === "string") return body[key]!.trim();
    if (typeof prev[key] === "string") return String(prev[key]).trim();
    return "";
  };
  return {
    events_dek: pick("events_dek"),
    about_title: pick("about_title"),
    about_dek: pick("about_dek"),
    about_body: pick("about_body"),
    updated_at: new Date().toISOString(),
  };
}

const MAX_DEK = 800;
const MAX_TITLE = 200;
const MAX_ABOUT_DEK = 400;
const MAX_BODY = 40_000;

export function validatePageCopy(copy: PageCopy): string | null {
  if (copy.events_dek.length > MAX_DEK) {
    return `Events dek is too long (max ${MAX_DEK} characters)`;
  }
  if (copy.about_title.length > MAX_TITLE) {
    return `About title is too long (max ${MAX_TITLE} characters)`;
  }
  if (copy.about_dek.length > MAX_ABOUT_DEK) {
    return `About dek is too long (max ${MAX_ABOUT_DEK} characters)`;
  }
  if (copy.about_body.length > MAX_BODY) {
    return `About body is too long (max ${MAX_BODY} characters)`;
  }
  return null;
}
