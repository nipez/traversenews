/**
 * JSON-LD + sitemap SEO foundations.
 * Run: npm run test:seo-json-ld
 */
import {
  breadcrumbListJsonLd,
  newsArticleJsonLd,
  siteDefaultImageUrl,
  siteGraphJsonLd,
} from "../src/lib/json-ld";
import {
  publicMetaDescriptions,
  publicPageMeta,
  publicTitleSegments,
  storyDocumentTitle,
} from "../src/lib/page-meta";
import type { PublicOriginalCard } from "../src/lib/public-snapshots";
import {
  buildNewsSitemapXml,
  buildSitemapXml,
} from "../src/lib/sitemap";
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

/** Real live slug used for field-shape validation (fixture data, not a network fetch). */
const prowlingStory = (): PublicOriginalCard =>
  sampleStory({
    slug: "traverse-city-commissioners-advance-prowling-park-trespass-rules",
    title:
      "Traverse City commissioners advance prowling, park-trespass rules after heated Hull Park debate",
    dek: "All but one commissioner backed the two ordinances Monday night after a public comment period that forced a short recess. A vote to formally enact them is scheduled for Oct. 19.",
    url: "https://traverse.news/story/traverse-city-commissioners-advance-prowling-park-trespass-rules",
    published_at: "2026-10-08T15:40:04.056Z",
    image_url: null,
    section: "Civic",
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
  const action = web.potentialAction as {
    "@type": string;
    target: { urlTemplate: string };
    "query-input": string;
  };
  assert(action["@type"] === "SearchAction", "SearchAction present");
  assert(
    action.target.urlTemplate ===
      "https://traverse.news/search?q={search_term_string}",
    "SearchAction urlTemplate",
  );
  assert(
    action["query-input"] === "required name=search_term_string",
    "SearchAction query-input",
  );
  assert(!JSON.stringify(graph).includes("Ann Arbor"), "TC graph has no AA");

  const article = newsArticleJsonLd(sampleStory());
  assert(article["@type"] === "NewsArticle", "article type");
  assert(article.headline === "Sample original headline", "headline");
  assert(article.description === "A short dek for the piece.", "dek");
  assert(article.datePublished === "2026-09-10T12:00:00.000Z", "datePublished");
  assert(article.dateModified === article.datePublished, "dateModified = publish");
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
  assert(Array.isArray(noImage.image), "fallback image always present");
  assert(
    (noImage.image as string[])[0] === siteDefaultImageUrl(),
    "fallback is site default image",
  );

  // Real slug shape check (required NewsArticle fields).
  const live = newsArticleJsonLd(prowlingStory());
  const liveJson = JSON.stringify(live);
  JSON.parse(liveJson); // must parse
  for (const key of [
    "headline",
    "datePublished",
    "dateModified",
    "author",
    "publisher",
    "image",
    "mainEntityOfPage",
  ] as const) {
    assert(live[key] !== undefined, `prowling story has ${key}`);
  }
  assert(
    (live.author as { name: string }).name === "traverse.news",
    "prowling author desk",
  );
  assert(
    (live.publisher as { logo: { url: string } }).logo.url.includes("favicon"),
    "prowling publisher logo",
  );
  assert(
    (live.mainEntityOfPage as { "@id": string })["@id"].includes(
      "traverse-city-commissioners-advance-prowling-park-trespass-rules",
    ),
    "prowling mainEntityOfPage",
  );

  const crumbs = breadcrumbListJsonLd([
    { name: "Today", path: "/" },
    {
      name: prowlingStory().title,
      path: `/story/${prowlingStory().slug}`,
    },
  ]);
  assert(crumbs["@type"] === "BreadcrumbList", "breadcrumb type");
  assert(
    (crumbs.itemListElement as unknown[]).length === 2,
    "breadcrumb two steps",
  );

  const meta = publicPageMeta("Events in Traverse City", {
    canonicalPath: "/events",
  });
  assert(
    (meta.alternates as { canonical?: string })?.canonical === "/events",
    "canonical path on meta",
  );
  assert(
    (meta.twitter as { card?: string })?.card === "summary_large_image",
    "twitter card large image",
  );
  assert(
    Array.isArray((meta.openGraph as { images?: unknown })?.images),
    "og:image fallback on section meta",
  );

  const storyMeta = publicPageMeta(storyDocumentTitle("Headline here"), {
    absoluteTitle: true,
    canonicalPath: "/story/headline-here",
  });
  assert(
    (storyMeta.title as { absolute?: string })?.absolute ===
      "Headline here | traverse.news",
    "story absolute title uses pipe",
  );

  const homeTitle = publicTitleSegments().home;
  assert(homeTitle.length <= 60, `home title under 60 chars (got ${homeTitle.length})`);
  assert(homeTitle.includes("Traverse City News Today"), "home title intent");
  assert(homeTitle.includes("traverse.news"), "home title brand");
  const homeDesc = publicMetaDescriptions().home;
  assert(homeDesc.length <= 155, `home desc under 155 (got ${homeDesc.length})`);
  assert(publicMetaDescriptions().events.includes("Traverse City"), "events desc");
  assert(publicMetaDescriptions().sports.includes("Traverse City"), "sports desc");

  const xml = buildSitemapXml({
    stories: [
      {
        is_original: true,
        slug: "sample-original",
        title: "Sample original headline",
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
  assert(xml.includes("https://traverse.news/shows"), "section shows");
  assert(xml.includes("https://traverse.news/sports"), "section sports");
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

  const now = new Date("2026-10-19T00:00:00.000Z");
  const newsXml = buildNewsSitemapXml(
    {
      stories: [
        {
          is_original: true,
          slug: "fresh-piece",
          title: "Fresh piece & more",
          published_at: "2026-10-18T12:00:00.000Z",
        },
        {
          is_original: true,
          slug: "stale-piece",
          title: "Stale piece",
          published_at: "2026-10-01T12:00:00.000Z",
        },
        {
          is_original: false,
          slug: "agg-outbound",
          title: "Outbound",
          published_at: "2026-10-18T12:00:00.000Z",
        },
      ],
    },
    now,
  );
  assert(newsXml.includes('xmlns:news='), "news namespace");
  assert(newsXml.includes("<news:news>"), "news:news block");
  assert(newsXml.includes("<news:name>Traverse News</news:name>"), "publication name");
  assert(newsXml.includes("<news:language>en</news:language>"), "language");
  assert(newsXml.includes("/story/fresh-piece"), "fresh in news sitemap");
  assert(newsXml.includes("Fresh piece &amp; more"), "title xml-escaped");
  assert(!newsXml.includes("/story/stale-piece"), "stale excluded from news sitemap");
  assert(!newsXml.includes("/story/agg-outbound"), "no outbound in news sitemap");
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
  const action = web.potentialAction as { target: { urlTemplate: string } };
  assert(
    action.target.urlTemplate.includes("search?q="),
    "AA SearchAction",
  );
  assert(
    !action.target.urlTemplate.includes("traverse.news"),
    "AA SearchAction not TC",
  );

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

  const homeTitle = publicTitleSegments().home;
  assert(homeTitle.includes("Ann Arbor News Today"), "AA home title");
  assert(homeTitle.includes("a2.news"), "AA home brand");
  assert(!homeTitle.includes("Traverse"), "AA home no TC");
}

setSite("traverse");
console.log("test-seo-json-ld: ok");
