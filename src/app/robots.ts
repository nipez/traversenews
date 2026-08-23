import type { MetadataRoute } from "next";

/**
 * Public crawlers: allow the site, keep Desk/API out of the crawl budget.
 * Sitemap always points at the canonical traverse.news host.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/desk", "/desk/", "/api/", "/api"],
      },
    ],
    sitemap: "https://traverse.news/sitemap.xml",
  };
}
