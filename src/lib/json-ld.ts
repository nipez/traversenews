import { getPublicOriginalByline } from "@/lib/originals";
import type { PublicOriginalCard } from "@/lib/public-snapshots";
import { getSite, siteOrigin, siteWordmark } from "@/lib/sites";

/** Absolute favicon — present on every deploy; used as Organization logo. */
export function siteLogoUrl(): string {
  return `${siteOrigin()}/favicon.ico`;
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
  const image = story.image_url?.trim() || null;

  const article: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: story.title,
    description: story.dek || undefined,
    datePublished: story.published_at,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    url,
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

  if (image) {
    article.image = [image];
  }

  // dateModified only when we have a distinct value (public card has publish time only).
  return article;
}
