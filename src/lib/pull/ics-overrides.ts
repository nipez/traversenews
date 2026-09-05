import type { Source } from "@/lib/types";

/**
 * Verified public ICS URLs — KV may still hold the HTML calendar page.
 * Client-safe: no node-ical / node:fs. Desk ingest-path and Worker pull
 * both read this map; parsing stays in pull/ics.ts (server only).
 */
export const ICS_FEED_OVERRIDES: Record<string, string> = {
  src_saline_cal:
    "https://calendar.google.com/calendar/ical/saline.k12.mi.us_tsbl8qslkk5cv66m75m4js4it4%40group.calendar.google.com/public/basic.ics",
};

export function icsFeedUrl(source: Source): string | null {
  return ICS_FEED_OVERRIDES[source.id] ?? source.feed_url;
}

export function hasIcsFeedOverride(sourceId: string): boolean {
  return sourceId in ICS_FEED_OVERRIDES;
}
