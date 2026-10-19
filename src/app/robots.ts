import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/sites";

/**
 * Public crawlers: allow the site, keep Desk/API out of the crawl budget.
 * Both the regular sitemap and Google News sitemap are listed.
 */
export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/desk", "/desk/", "/api/", "/api"],
      },
    ],
    sitemap: [`${origin}/sitemap.xml`, `${origin}/news-sitemap.xml`],
  };
}
