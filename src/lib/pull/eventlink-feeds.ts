import type { Source } from "@/lib/types";

/**
 * EventLink Events tables the Worker can read (printed date + clock or TBD).
 * Client-safe constants — HTML scrape stays in pull/html-athletics.ts.
 */
export const EVENTLINK_ATHLETICS_FEEDS: Record<string, string> = {
  src_pioneer_ath: "https://pioneerathletics.net/Events",
  src_dexter_ath: "https://websites.eventlink.com/s/dexterathletics/Events",
  src_saline_ath: "https://websites.eventlink.com/s/saline/Events",
  src_chelsea_ath: "https://chelseabulldogs.org/Events",
  src_milan_ath: "https://milanbigreds.org/Events",
};

export const EVENTLINK_ATHLETICS_SOURCE_IDS = new Set(
  Object.keys(EVENTLINK_ATHLETICS_FEEDS),
);

/** Prefer the verified EventLink list — KV may still hold dead Arbiter /front URLs. */
export function eventLinkFeedUrl(source: Source): string | null {
  return EVENTLINK_ATHLETICS_FEEDS[source.id] ?? source.feed_url;
}
