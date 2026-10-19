import type { Metadata } from "next";
import { siteDefaultImageUrl } from "@/lib/json-ld";
import { getSite, siteWordmark } from "@/lib/sites";

/**
 * Public <title> segments (layout template adds ` · ${wordmark}`).
 * Place name comes from site config — never hardcode Traverse City here.
 * `home` is the full default title (layout does not apply the template).
 */
export function publicTitleSegments() {
  const place = getSite().place;
  const mark = siteWordmark();
  return {
    /**
     * Homepage SERP title — “{place} news” intent, under ~60 chars.
     * Includes brand; layout uses this as `title.default` (no template).
     */
    home: `${place} News Today | Local MI News – ${mark}`,
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

/** Unique meta descriptions for public section + utility pages. */
export function publicMetaDescriptions() {
  const place = getSite().place;
  const mark = siteWordmark();
  const site = getSite();
  return {
    home: site.description,
    events: `Concerts, festivals, markets, and nights out in ${place}. Listings pulled from local calendars on ${mark}.`,
    sports: `Prep sports and area athletics in ${place} — this week's games plus headlines from local sports desks.`,
    schools: `Important school dates in ${place}: half days, no-school days, conferences, and breaks by district.`,
    civic: `City and county meetings in ${place} — agendas and civic calendar listings on ${mark}.`,
    shows: `Movies and live theatre showtimes in ${place}, grouped by venue on ${mark}.`,
    local: `Useful ${place} directories — city offices, maps, and outbound links when you need a number.`,
    about: site.pageCopy.aboutDek,
    email: `The ${place} morning email: original news when we have it, plus events, civic, schools, and sports.`,
    emailArchive: `Past morning emails from ${mark}.`,
    editions: `Daily ${place} editions archived on ${mark}.`,
    tips: `Send a tip or correction to the ${mark} desk covering ${place}.`,
    search: `Search headlines, events, civic meetings, schools, and alerts on ${mark}.`,
  } as const;
}

export function withBrandTitle(segment: string): string {
  return `${segment} · ${siteWordmark()}`;
}

/** Story SERP / share title: `<headline> | wordmark` (bypasses layout template). */
export function storyDocumentTitle(headline: string): string {
  return `${headline} | ${siteWordmark()}`;
}

type PublicMetaExtra = Metadata & {
  /** Path for rel=canonical (resolved against layout metadataBase). */
  canonicalPath?: string;
  /**
   * When true, `title` is used as an absolute document title (no ` · wordmark`
   * template). Used for story pages (`headline | wordmark`).
   */
  absoluteTitle?: boolean;
};

/**
 * Page metadata: `title` is the template segment; openGraph + twitter
 * get the resolved branded string so shares match the SERP title.
 * Pass `canonicalPath` (e.g. `/events` or `/story/slug`) for a consistent
 * absolute canonical via layout `metadataBase`.
 */
export function publicPageMeta(
  segment: string,
  extra: PublicMetaExtra = {},
): Metadata {
  const { canonicalPath, absoluteTitle, ...rest } = extra;
  const full = absoluteTitle ? segment : withBrandTitle(segment);
  const og =
    typeof rest.openGraph === "object" && rest.openGraph
      ? rest.openGraph
      : {};
  const tw =
    typeof rest.twitter === "object" && rest.twitter ? rest.twitter : {};
  const fromExtra =
    typeof rest.alternates === "object" && rest.alternates
      ? rest.alternates
      : {};
  const alternates = {
    ...fromExtra,
    ...(canonicalPath ? { canonical: canonicalPath } : {}),
  };
  const description =
    typeof rest.description === "string" ? rest.description : undefined;
  const defaultImage = siteDefaultImageUrl();
  const ogImages =
    "images" in og && og.images
      ? og.images
      : [{ url: defaultImage }];
  const twImages =
    "images" in tw && tw.images
      ? tw.images
      : [defaultImage];

  return {
    ...rest,
    title: absoluteTitle ? { absolute: segment } : segment,
    ...(Object.keys(alternates).length > 0 ? { alternates } : {}),
    openGraph: {
      ...og,
      title: full,
      ...(description ? { description } : {}),
      images: ogImages,
      ...(canonicalPath ? { url: canonicalPath } : {}),
    },
    twitter: {
      card: "summary_large_image",
      ...tw,
      title: full,
      ...(description ? { description } : {}),
      images: twImages,
    },
  };
}
