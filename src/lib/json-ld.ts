import { getPublicOriginalByline } from "@/lib/originals";
import type { PublicOriginalCard } from "@/lib/public-snapshots";
import { getSite, siteOrigin, siteWordmark } from "@/lib/sites";

/** Absolute favicon — present on every deploy; used as Organization logo. */
export function siteLogoUrl(): string {
  return `${siteOrigin()}/favicon.ico`;
}

/**
 * Default share / NewsArticle image when a story has no photo.
 * Prefers the site hero art; falls back to the favicon.
 */
export function siteDefaultImageUrl(): string {
  const hero = getSite().hero.src?.trim();
  if (hero) {
    if (hero.startsWith("http://") || hero.startsWith("https://")) return hero;
    const path = hero.startsWith("/") ? hero : `/${hero}`;
    return `${siteOrigin()}${path}`;
  }
  return siteLogoUrl();
}

export function organizationJsonLd() {
  const site = getSite();
  const origin = siteOrigin();
  return {
    "@type": "Organization",
    "@id": `${origin}/#organization`,
    name: site.name,
    url: origin,
    logo: {
      "@type": "ImageObject",
      url: siteLogoUrl(),
    },
  };
}

export function websiteJsonLd() {
  const site = getSite();
  const origin = siteOrigin();
  const mark = siteWordmark();
  return {
    "@type": "WebSite",
    "@id": `${origin}/#website`,
    name: mark,
    url: origin,
    description: site.description,
    publisher: { "@id": `${origin}/#organization` },
    inLanguage: "en-US",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${origin}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Site-wide graph for the root layout: Organization + WebSite.
 * Place / brand come from getSite() — never hardcode Traverse City.
 */
export function siteGraphJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [organizationJsonLd(), websiteJsonLd()],
  };
}

function absoluteUrl(maybe: string | null | undefined, fallbackPath: string): string {
  const origin = siteOrigin();
  const raw = (maybe ?? "").trim();
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return `${origin}${raw}`;
  return `${origin}${fallbackPath}`;
}

/**
 * NewsArticle for a published original. Author is the desk Organization
 * (wordmark), never a staff name.
 */
export function newsArticleJsonLd(story: PublicOriginalCard) {
  const origin = siteOrigin();
  const url = absoluteUrl(story.url, `/story/${story.slug}`);
  const desk = getPublicOriginalByline();
  const image = story.image_url?.trim() || siteDefaultImageUrl();

  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: story.title,
    description: story.dek || undefined,
    datePublished: story.published_at,
    // Public cards do not carry a separate updated_at; publish time is authoritative.
    dateModified: story.published_at,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    url,
    image: [image],
    author: {
      "@type": "Organization",
      name: desk,
      url: origin,
    },
    publisher: {
      "@type": "Organization",
      name: getSite().name,
      url: origin,
      logo: {
        "@type": "ImageObject",
        url: siteLogoUrl(),
      },
    },
  };
}

/**
 * BreadcrumbList for a public page. `crumbs` are ordered root → leaf.
 * Each crumb needs a name; `item` (absolute or path) is optional on the leaf.
 */
export function breadcrumbListJsonLd(
  crumbs: Array<{ name: string; path?: string }>,
) {
  const origin = siteOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, i) => {
      const entry: Record<string, unknown> = {
        "@type": "ListItem",
        position: i + 1,
        name: crumb.name,
      };
      if (crumb.path) {
        entry.item =
          crumb.path.startsWith("http://") || crumb.path.startsWith("https://")
            ? crumb.path
            : `${origin}${crumb.path.startsWith("/") ? crumb.path : `/${crumb.path}`}`;
      }
      return entry;
    }),
  };
}
