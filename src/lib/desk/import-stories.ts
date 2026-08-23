import { stableStoryId } from "@/lib/alerts";
import type { Source, Story } from "@/lib/types";

export type StoryImportRow = {
  title: string;
  dek?: string;
  url?: string;
  published_at?: string;
  source_id?: string;
};

export type StoryImportResult = {
  imported: Story[];
  source_ids: string[];
  skipped: Array<{ index: number; reason: string }>;
};

function truncateDek(input: string, max = 180): string {
  const t = input.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

/**
 * Normalize browser-pulled story rows (Facebook alerts).
 * Never invents titles or URLs — invalid rows are skipped.
 */
export function normalizeImportedStories(
  rows: StoryImportRow[],
  sources: Source[],
  defaultSourceId: string,
): StoryImportResult {
  const byId = new Map(sources.map((s) => [s.id, s]));
  const imported: Story[] = [];
  const skipped: StoryImportResult["skipped"] = [];
  const sourceIds = new Set<string>();

  rows.forEach((row, index) => {
    const title = typeof row.title === "string" ? row.title.trim() : "";
    if (!title) {
      skipped.push({ index, reason: "Missing title" });
      return;
    }

    const sourceId =
      (typeof row.source_id === "string" && row.source_id.trim()) ||
      defaultSourceId;
    if (!byId.has(sourceId)) {
      skipped.push({ index, reason: `Unknown source_id: ${sourceId}` });
      return;
    }

    const url = typeof row.url === "string" ? row.url.trim() : "";
    if (!url) {
      skipped.push({ index, reason: "Missing url (Facebook permalink)" });
      return;
    }

    let published_at = new Date().toISOString();
    if (typeof row.published_at === "string" && row.published_at.trim()) {
      const d = new Date(row.published_at.trim());
      if (Number.isNaN(d.getTime())) {
        skipped.push({ index, reason: "Invalid published_at" });
        return;
      }
      published_at = d.toISOString();
    }

    const dek =
      typeof row.dek === "string" && row.dek.trim()
        ? truncateDek(row.dek)
        : "";

    imported.push({
      id: stableStoryId(sourceId, url),
      source_id: sourceId,
      title,
      dek,
      url,
      published_at,
      is_original: false,
      body: null,
      image_url: null,
      byline: null,
      slug: null,
    });
    sourceIds.add(sourceId);
  });

  return {
    imported,
    source_ids: [...sourceIds],
    skipped,
  };
}
