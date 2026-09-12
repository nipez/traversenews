/**
 * JSON-LD + sitemap SEO foundations.
 * Run: npm run test:seo-json-ld
 */
import { newsArticleJsonLd, siteGraphJsonLd } from "../src/lib/json-ld";
import { publicPageMeta } from "../src/lib/page-meta";
import type { PublicOriginalCard } from "../src/lib/public-snapshots";
import { buildSitemapXml } from "../src/lib/sitemap";
import { getSite, resetSiteCache, siteWordmark } from "../src/lib/sites";
import { resetSeedCatalog } from "../src/lib/data/store";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

function setSite(id: string) {
  process.env.SITE_ID = id;
  process.env.NEXT_PUBLIC_SITE_ID = id;
  // Clear overlay so siteOrigin() uses SiteConfig.defaultOrigin (TS: env keys are required).
  process.env.NEXT_PUBLIC_SITE_URL = "";
  resetSiteCache();
  resetSeedCatalog();
}

const sampleStory = (overrides: Partial<PublicOriginalCard> = {}): PublicOriginalCard => ({
  id: "story_1",
  slug: "sample-original",
  title: "Sample original headline",
  dek: "A short dek for the piece.",
  body: "Paragraph one.\n\nParagraph two.",
  url: "https://traverse.news/story/sample-original",
  published_at: "2026-09-10T12:00:00.000Z",
  byline: "traverse.news",
  image_url: "https://example.com/photo.jpg",
  image_credit: null,
  image_caption: null,
  source_urls: [],
  section: "Local",
  ...overrides,
});

setSite("traverse");
{
  const graph = siteGraphJsonLd();
  assert(graph["@context"] === "https://schema.org", "graph context");
  assert(Array.isArray(graph["@graph"]), "graph array");
  const org = graph["@graph"][0] as Record<string, unknown>;
  const web = graph["@graph"][1] as Record<string, unknown>;
  assert(org["@type"] === "Organization", "org type");
  assert(org.name === "Traverse News", "org name from site");
  assert(org.url === "https://traverse.news", "org url");
  assert(
    (org.logo as { url?: string })?.url === "https://traverse.news/favicon.ico",
    "org logo",
  );
  assert(web["@type"] === "WebSite", "website type");
  assert(web.name === "traverse.news", "website name is wordmark");
  assert(!JSON.stringify(graph).includes("Ann Arbor"), "TC graph has no AA");

  const article = newsArticleJsonLd(sampleStory());
  assert(article["@type"] === "NewsArticle", "article type");
  assert(article.headline === "Sample original headline", "headline");
  assert(article.description === "A short dek for the piece.", "dek");
  assert(article.datePublished === "2026-09-10T12:00:00.000Z", "datePublished");
  assert(article.dateModified === undefined, "no invented dateModified");
  const author = article.author as { "@type": string; name: string };
  assert(author["@type"] === "Organization", "author is Organization");
  assert(author.name === siteWordmark(), "author is desk wordmark");
  assert(!author.name.toLowerCase().includes("perez"), "no Nick byline");
  assert(!author.name.toLowerCase().includes("nick"), "no Nick byline 2");
  const publisher = article.publisher as {
    name: string;
    logo: { url: string };
  };
  assert(publisher.name === getSite().name, "publisher site name");
  assert(Array.isArray(article.image), "image when present");
  assert(
    (article.mainEntityOfPage as { "@id": string })["@id"].includes(
      "/story/sample-original",
    ),
    "mainEntityOfPage",
  );

  const noImage = newsArticleJsonLd(sampleStory({ image_url: null }));
  assert(noImage.image === undefined, "omit image when missing");

  const meta = publicPageMeta("Events in Traverse City", {
    canonicalPath: "/events",
  });
  assert(
    (meta.alternates as { canonical?: string })?.canonical === "/events",
    "canonical path on meta",
  );

  const xml = buildSitemapXml({
    stories: [
      {
        is_original: true,
        slug: "sample-original",
        published_at: "2026-09-10T12:00:00.000Z",
      },
      { is_original: false, slug: "agg", published_at: "2026-09-10T12:00:00.000Z" },
    ],
    editions: [{ date: "2026-09-11", captured_at: "2026-09-11T12:00:00.000Z" }],
    email_editions: [
      { date: "2026-09-10", captured_at: "2026-09-10T12:00:00.000Z" },
    ],
  });
  assert(xml.startsWith("<?xml"), "xml declaration");
  assert(xml.includes("<urlset"), "urlset");
  assert(xml.includes("https://traverse.news/events"), "section events");
  assert(xml.includes("https://traverse.news/civic"), "section civic");
  assert(xml.includes("https://traverse.news/search"), "section search");
  assert(
    xml.includes("https://traverse.news/story/sample-original"),
    "published original",
  );
  assert(xml.includes("<lastmod>2026-09-10T12:00:00.000Z</lastmod>"), "story lastmod");
  assert(xml.includes("/editions/2026-09-11"), "edition url");
  assert(xml.includes("/email/2026-09-10"), "email edition url");
  assert(!xml.includes("/story/agg"), "no aggregated card urls");
  assert(!xml.includes("/whats-on"), "no whats-on redirect");
  assert(!xml.includes("/desk"), "no desk");
}

setSite("ann-arbor");
{
  const graph = siteGraphJsonLd();
  const org = graph["@graph"][0] as Record<string, unknown>;
  const web = graph["@graph"][1] as Record<string, unknown>;
  assert(org.name === "A2 News", "AA org name");
  assert(web.name === "a2.news", "AA website wordmark");
  assert(!JSON.stringify(graph).includes("Traverse City"), "AA no TC place");
  assert(!JSON.stringify(graph).includes("traverse.news"), "AA no TC domain");

  const article = newsArticleJsonLd(
    sampleStory({
      url: `${getSite().defaultOrigin}/story/sample-original`,
      byline: siteWordmark(),
    }),
  );
  const author = article.author as { name: string };
  assert(author.name === "a2.news", "AA desk credit");
  assert(!JSON.stringify(article).includes("Nick"), "AA no Nick");
  assert(!JSON.stringify(article).includes("Perez"), "AA no Perez");
  assert(!JSON.stringify(article).includes("Traverse City"), "AA article no TC");

  const xml = buildSitemapXml({
    stories: [
      {
        is_original: true,
        slug: "aa-piece",
        published_at: "2026-09-09T12:00:00.000Z",
      },
    ],
  });
  assert(xml.includes(`${getSite().defaultOrigin}/story/aa-piece`), "AA story loc");
  assert(!xml.includes("https://traverse.news/"), "AA sitemap not TC origin");
}

setSite("traverse");
console.log("test-seo-json-ld: ok");
