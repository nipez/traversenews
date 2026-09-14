import Parser from "rss-parser";
import { newId } from "@/lib/ids";
import { getSite } from "@/lib/sites";
import { sanitizePublicText } from "@/lib/text-encoding";
import type { Source, Story } from "@/lib/types";

function rssParser(): Parser {
  return new Parser({
    timeout: 15000,
    headers: {
      "User-Agent": getSite().userAgent,
      Accept: "application/rss+xml, application/xml, text/xml, */*",
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

/**
 * Fetch feed bytes and decode as UTF-8 before xml parse.
 *
 * Do not use rss-parser's parseURL: on Cloudflare Workers its https
 * setEncoding path can treat UTF-8 body bytes as latin1, which stores
 * curly punctuation as mojibake (â€™ / â€” / â€¦) in KV and the letter.
 */
async function fetchFeedXml(feedUrl: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(feedUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": getSite().userAgent,
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
    });
    if (!res.ok) {
      throw new Error(`RSS HTTP ${res.status}`);
    }
    const bytes = await res.arrayBuffer();
    return new TextDecoder("utf-8").decode(bytes);
  } finally {
    clearTimeout(timer);
  }
}

export async function pullRssSource(source: Source): Promise<Story[]> {
  if (!source.feed_url) return [];
  const xml = await fetchFeedXml(source.feed_url);
  const feed = await rssParser().parseString(xml);
  const items = feed.items.slice(0, 25);
  const stories: Story[] = [];
  for (const item of items) {
    const title = sanitizePublicText(item.title ?? "");
    const url = resolveItemUrl(item.link ?? item.guid ?? "", source);
    if (!title || !url || !/^https?:\/\//i.test(url)) continue;
    const rawDek =
      item.contentSnippet ||
      item.summary ||
      item.content ||
      item["content:encoded"] ||
      "";
    const dek = truncate(sanitizePublicText(stripHtml(String(rawDek))));
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
