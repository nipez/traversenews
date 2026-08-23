import type { MetadataRoute } from "next";
import {
  getAppData,
  listEditions,
  listEmailEditions,
  repairPublishedOriginalStories,
} from "@/lib/data/store";
import { isBannedOriginalSlug } from "@/lib/data/scrub";

export const dynamic = "force-dynamic";

/** Canonical public host — never workers.dev in sitemap locs. */
const SITE = "https://traverse.news";

const STATIC_PATHS = [
  "/",
  "/whats-on",
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

/**
 * Public sitemap only. Desk, login, API, and draft originals stay out.
 * lastmod only when data has a real date — never invent one.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await repairPublishedOriginalStories();
  const data = await getAppData();
  const editions = await listEditions();
  const emailEditions = await listEmailEditions();

  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: path === "/" ? SITE : `${SITE}${path}`,
  }));

  const seenSlugs = new Set<string>();
  for (const story of data.stories) {
    if (!story.is_original) continue;
    const slug = story.slug?.trim();
    if (!slug || isBannedOriginalSlug(slug) || seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);
    const entry: MetadataRoute.Sitemap[number] = {
      url: `${SITE}/story/${slug}`,
    };
    if (story.published_at) {
      const d = new Date(story.published_at);
      if (!Number.isNaN(d.getTime())) entry.lastModified = d;
    }
    entries.push(entry);
  }

  for (const edition of editions) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(edition.date)) continue;
    const entry: MetadataRoute.Sitemap[number] = {
      url: `${SITE}/editions/${edition.date}`,
    };
    if (edition.captured_at) {
      const d = new Date(edition.captured_at);
      if (!Number.isNaN(d.getTime())) entry.lastModified = d;
    }
    entries.push(entry);
  }

  for (const letter of emailEditions) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(letter.date)) continue;
    const entry: MetadataRoute.Sitemap[number] = {
      url: `${SITE}/email/${letter.date}`,
    };
    if (letter.captured_at) {
      const d = new Date(letter.captured_at);
      if (!Number.isNaN(d.getTime())) entry.lastModified = d;
    }
    entries.push(entry);
  }

  return entries;
}
