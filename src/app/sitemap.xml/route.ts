import {
  buildSitemapXml,
  loadSitemapSlice,
  readCachedSitemapXml,
  writeCachedSitemapXml,
  SITEMAP_TTL_SECONDS,
} from "@/lib/sitemap";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Cheap public sitemap. Cached in KV (~15m) so crawlers do not re-parse
 * the full app_data blob (or walk events) on every hit.
 */
export async function GET() {
  const cached = await readCachedSitemapXml();
  if (cached) {
    return new Response(cached, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": `public, max-age=60, s-maxage=${SITEMAP_TTL_SECONDS}`,
        "X-Traverse-Sitemap": "kv-cache",
      },
    });
  }

  const slice = await loadSitemapSlice();
  const xml = buildSitemapXml(slice);
  await writeCachedSitemapXml(xml);

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": `public, max-age=60, s-maxage=${SITEMAP_TTL_SECONDS}`,
      "X-Traverse-Sitemap": "miss",
    },
  });
}
