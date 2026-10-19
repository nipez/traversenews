import {
  buildNewsSitemapXml,
  loadSitemapSlice,
  readCachedNewsSitemapXml,
  writeCachedNewsSitemapXml,
  SITEMAP_TTL_SECONDS,
} from "@/lib/sitemap";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Google News sitemap — originals published in the last 48 hours.
 * Cached in KV (~15m) like the regular sitemap.
 */
export async function GET() {
  const cached = await readCachedNewsSitemapXml();
  if (cached) {
    return new Response(cached, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": `public, max-age=60, s-maxage=${SITEMAP_TTL_SECONDS}`,
        "X-Traverse-News-Sitemap": "kv-cache",
      },
    });
  }

  const slice = await loadSitemapSlice();
  const xml = buildNewsSitemapXml(slice);
  await writeCachedNewsSitemapXml(xml);

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": `public, max-age=60, s-maxage=${SITEMAP_TTL_SECONDS}`,
      "X-Traverse-News-Sitemap": "miss",
    },
  });
}
