import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/sites";

/**
 * Public crawlers: allow the site, keep Desk/API out of the crawl budget.
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
    sitemap: `${siteOrigin()}/sitemap.xml`,
  };
}
