import Parser from "rss-parser";
import { newId } from "@/lib/ids";
import { getSite } from "@/lib/sites";
import type { Source, Story } from "@/lib/types";

function rssParser(): Parser {
  return new Parser({
    timeout: 15000,
    headers: {
      "User-Agent": getSite().userAgent,
    },
  });
}

function stripHtml(input: string): string {
  return input
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(input: string, max = 220): string {
  if (input.length <= max) return input;
  return `${input.slice(0, max - 1).trim()}…`;
}

function resolveItemUrl(raw: string, source: Source): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    return new URL(trimmed, source.homepage || source.feed_url || undefined).href;
  } catch {
    return trimmed;
  }
}

export async function pullRssSource(source: Source): Promise<Story[]> {
  if (!source.feed_url) return [];
  const feed = await rssParser().parseURL(source.feed_url);
  const items = feed.items.slice(0, 25);
  const stories: Story[] = [];
  for (const item of items) {
    const title = (item.title ?? "").trim();
    const url = resolveItemUrl(item.link ?? item.guid ?? "", source);
    if (!title || !url || !/^https?:\/\//i.test(url)) continue;
    const rawDek =
      item.contentSnippet ||
      item.summary ||
      item.content ||
      item["content:encoded"] ||
      "";
    const dek = truncate(stripHtml(String(rawDek)));
    const published =
      item.isoDate ||
      (item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString());
    stories.push({
      id: newId("story"),
      source_id: source.id,
      title,
      dek,
      url,
      published_at: published,
      is_original: false,
      body: null,
      image_url: null,
      byline: null,
      slug: null,
    });
  }
  return stories;
}
