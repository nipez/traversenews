import Parser from "rss-parser";
import { newId } from "@/lib/ids";
import type { Source, Story } from "@/lib/types";

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent": "traverse.news-puller/1.0 (+https://traverse.news)",
  },
});

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

export async function pullRssSource(source: Source): Promise<Story[]> {
  if (!source.feed_url) return [];
  const feed = await parser.parseURL(source.feed_url);
  const items = feed.items.slice(0, 25);
  const stories: Story[] = [];
  for (const item of items) {
    const title = (item.title ?? "").trim();
    const url = (item.link ?? item.guid ?? "").trim();
    if (!title || !url) continue;
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
