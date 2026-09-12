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

type PublicMetaExtra = Metadata & {
  /** Path for rel=canonical (resolved against layout metadataBase). */
  canonicalPath?: string;
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
  const { canonicalPath, ...rest } = extra;
  const full = withBrandTitle(segment);
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
  return {
    ...rest,
    title: segment,
    ...(Object.keys(alternates).length > 0 ? { alternates } : {}),
    openGraph: {
      ...og,
      title: full,
      ...(canonicalPath ? { url: canonicalPath } : {}),
    },
    twitter: {
      ...tw,
      title: full,
    },
  };
}
