import { newId, slugify } from "@/lib/ids";
import type { ClusteredStory, OriginalDraft, Story } from "@/lib/types";

export const DEFAULT_ORIGINAL_BYLINE = "Nick Perez";

export function uniqueOriginalSlug(
  title: string,
  existing: Story[],
  prefer?: string | null,
  keepId?: string | null,
): string {
  const base = (prefer?.trim() || slugify(title) || "original").slice(0, 80);
  let candidate = base;
  let n = 2;
  while (
    existing.some(
      (s) =>
        s.is_original &&
        s.slug === candidate &&
        (!keepId || s.id !== keepId),
    )
  ) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  return candidate;
}

export function draftFromPulledCluster(input: {
  cluster: Pick<
    ClusteredStory,
    "id" | "title" | "dek" | "url" | "sources"
  >;
  byline?: string;
  now?: Date;
}): OriginalDraft {
  const now = (input.now ?? new Date()).toISOString();
  const url = input.cluster.url.trim();
  return {
    id: newId("draft"),
    status: "draft",
    title: input.cluster.title.trim(),
    dek: input.cluster.dek.trim(),
    body: "",
    section: null,
    byline: input.byline?.trim() || DEFAULT_ORIGINAL_BYLINE,
    slug: null,
    source_urls: url ? [url] : [],
    based_on_story_ids: [input.cluster.id],
    source_title: input.cluster.title.trim(),
    source_dek: input.cluster.dek.trim(),
    published_story_id: null,
    created_at: now,
    updated_at: now,
    published_at: null,
  };
}

export function storyFromPublishedDraft(
  draft: OriginalDraft,
  slug: string,
  siteOrigin: string,
): Story {
  const publishedAt = draft.published_at ?? new Date().toISOString();
  return {
    id: draft.published_story_id ?? newId("story"),
    source_id: "src_tn",
    title: draft.title.trim(),
    dek: draft.dek.trim(),
    url: `${siteOrigin.replace(/\/$/, "")}/story/${slug}`,
    published_at: publishedAt,
    is_original: true,
    body: draft.body.trim() || null,
    image_url: null,
    byline: draft.byline.trim() || DEFAULT_ORIGINAL_BYLINE,
    slug,
    section: draft.section?.trim() || null,
  };
}

export const EDITORIAL_CHECKLIST = [
  "No new quotes — only wording that appears in a cited source",
  "No new facts, crashes, officials, or “organizers say” lines",
  "Every claim is supported by source_urls[] (real permalinks)",
  "Byline is staff (Nick Perez / Desk), not invented attribution",
] as const;
