import type { Metadata } from "next";
import { getSite, siteWordmark } from "@/lib/sites";

/**
 * Public <title> segments (layout template adds ` · ${wordmark}`).
 * Place name comes from site config — never hardcode Traverse City here.
 */
export function publicTitleSegments() {
  const place = getSite().place;
  return {
    /** Full homepage title including brand (layout `default`, no template). */
    home: `${place} News · ${siteWordmark()}`,
    events: `Events in ${place}`,
    sports: `Prep sports in ${place}`,
    schools: `Schools in ${place}`,
    civic: `Civic calendar · ${place}`,
    shows: `Movies & theatre · ${place}`,
    local: `Useful local · ${place}`,
    about: "About",
    email: `Morning email · ${place}`,
    emailArchive: "Past morning emails",
    editions: `Daily editions · ${place}`,
    tips: `Send a tip · ${place}`,
    search: "Search",
  } as const;
}

export function withBrandTitle(segment: string): string {
  return `${segment} · ${siteWordmark()}`;
}

/**
 * Page metadata: `title` is the template segment; openGraph + twitter
 * get the resolved branded string so shares match the SERP title.
 */
export function publicPageMeta(
  segment: string,
  extra: Metadata = {},
): Metadata {
  const full = withBrandTitle(segment);
  const og =
    typeof extra.openGraph === "object" && extra.openGraph
      ? extra.openGraph
      : {};
  const tw =
    typeof extra.twitter === "object" && extra.twitter ? extra.twitter : {};
  return {
    ...extra,
    title: segment,
    openGraph: {
      ...og,
      title: full,
    },
    twitter: {
      ...tw,
      title: full,
    },
  };
}
