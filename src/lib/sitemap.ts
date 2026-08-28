import { getTraverseDataKv, STORE_KEY } from "@/lib/data/kv";
import { isBannedOriginalSlug } from "@/lib/data/scrub";

/** Canonical public host — never workers.dev in sitemap locs. */
const SITE = "https://traverse.news";

const SITEMAP_CACHE_KEY = "cache:sitemap.xml:v1";
/** Minutes — keep crawler hits off the full store path. */
const SITEMAP_TTL_SECONDS = 15 * 60;

const STATIC_PATHS = [
  "/",
  "/whats-on",
  "/shows",
  "/civic",
  "/schools",
  "/sports",
  "/local",
  "/about",
  "/editions",
  "/email",
  "/email/archive",
  "/tips",
] as const;

type SitemapSlice = {
  stories?: Array<{
    is_original?: boolean;
    slug?: string | null;
    published_at?: string | null;
  }>;
  editions?: Array<{ date?: string; captured_at?: string | null }>;
  email_editions?: Array<{ date?: string; captured_at?: string | null }>;
};

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function lastmodAttr(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `<lastmod>${d.toISOString()}</lastmod>`;
}

/**
 * Build a small public sitemap: static routes + published originals +
 * edition / email archive dates. Never walks events, never repairs drafts.
 */
export function buildSitemapXml(slice: SitemapSlice): string {
  const urls: string[] = [];

  for (const path of STATIC_PATHS) {
    const loc = path === "/" ? SITE : `${SITE}${path}`;
    urls.push(`<url><loc>${xmlEscape(loc)}</loc></url>`);
  }

  const seenSlugs = new Set<string>();
  for (const story of slice.stories ?? []) {
    if (!story.is_original) continue;
    const slug = story.slug?.trim();
    if (!slug || isBannedOriginalSlug(slug) || seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);
    urls.push(
      `<url><loc>${xmlEscape(`${SITE}/story/${slug}`)}</loc>${lastmodAttr(story.published_at)}</url>`,
    );
  }

  for (const edition of slice.editions ?? []) {
    const date = edition.date?.trim();
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    urls.push(
      `<url><loc>${xmlEscape(`${SITE}/editions/${date}`)}</loc>${lastmodAttr(edition.captured_at)}</url>`,
    );
  }

  for (const letter of slice.email_editions ?? []) {
    const date = letter.date?.trim();
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    urls.push(
      `<url><loc>${xmlEscape(`${SITE}/email/${date}`)}</loc>${lastmodAttr(letter.captured_at)}</url>`,
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

/** One KV get of app_data; parse only the fields sitemap needs. No normalize/scrub/save. */
export async function loadSitemapSlice(): Promise<SitemapSlice> {
  const kv = await getTraverseDataKv();
  if (!kv) return {};
  try {
    const raw = await kv.get(STORE_KEY, "text");
    if (!raw) return {};
    const data = JSON.parse(raw) as SitemapSlice;
    return {
      stories: Array.isArray(data.stories) ? data.stories : [],
      editions: Array.isArray(data.editions) ? data.editions : [],
      email_editions: Array.isArray(data.email_editions)
        ? data.email_editions
        : [],
    };
  } catch {
    return {};
  }
}

export async function readCachedSitemapXml(): Promise<string | null> {
  const kv = await getTraverseDataKv();
  if (!kv) return null;
  try {
    return await kv.get(SITEMAP_CACHE_KEY, "text");
  } catch {
    return null;
  }
}

export async function writeCachedSitemapXml(xml: string): Promise<void> {
  const kv = await getTraverseDataKv();
  if (!kv) return;
  try {
    await kv.put(SITEMAP_CACHE_KEY, xml, {
      expirationTtl: SITEMAP_TTL_SECONDS,
    });
  } catch {
    // Cache miss next time is fine.
  }
}

export { SITEMAP_TTL_SECONDS, SITEMAP_CACHE_KEY };
