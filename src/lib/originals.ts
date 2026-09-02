import { newId, slugify } from "@/lib/ids";
import { siteWordmark } from "@/lib/sites";
import type { ClusteredStory, OriginalDraft, Story } from "@/lib/types";

/** Desk-only default when Nick starts a draft. Never show on the public paper. */
export const DEFAULT_ORIGINAL_BYLINE = "Nick Perez";

/**
 * Public credit on homepage / story / editions.
 * Displayed as "By traverse.news" — no staff name.
 */
export const PUBLIC_ORIGINAL_BYLINE = "traverse.news";

export function getPublicOriginalByline(): string {
  return siteWordmark();
}

const PRIVATE_BYLINES = new Set(
  ["nick perez", "nick", "perez", "desk", "staff"].map((s) => s.toLowerCase()),
);

/** True when a stored byline must not appear on the public site. */
export function isPrivateStaffByline(byline: string | null | undefined): boolean {
  const t = byline?.trim().toLowerCase();
  if (!t) return true;
  if (PRIVATE_BYLINES.has(t)) return true;
  if (t.includes("perez")) return true;
  return false;
}

/** Byline string stored on public `is_original` stories. */
export function publicOriginalByline(_raw?: string | null): string {
  return getPublicOriginalByline();
}

/** Full public credit line: "By traverse.news" (or the active city wordmark). */
export function formatPublicOriginalByline(_raw?: string | null): string {
  return `By ${getPublicOriginalByline()}`;
}

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
    image_url: null,
    image_credit: null,
    image_caption: null,
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
  const imageUrl = draft.image_url?.trim() || null;
  return {
    id: draft.published_story_id ?? newId("story"),
    source_id: "src_tn",
    title: draft.title.trim(),
    dek: draft.dek.trim(),
    url: `${siteOrigin.replace(/\/$/, "")}/story/${slug}`,
    published_at: publishedAt,
    is_original: true,
    body: draft.body.trim() || null,
    image_url: imageUrl,
    image_credit: imageUrl ? draft.image_credit?.trim() || null : null,
    image_caption: imageUrl ? draft.image_caption?.trim() || null : null,
    // Public story always gets the desk credit — draft may still say Nick.
    byline: getPublicOriginalByline(),
    slug,
    section: draft.section?.trim() || null,
    source_urls: draft.source_urls.map((u) => u.trim()).filter(Boolean),
  };
}

export const EDITORIAL_CHECKLIST = [
  "No new quotes — only wording that appears in a cited source",
  "No new facts, crashes, officials, or “organizers say” lines",
  "Every claim is supported by source_urls[] (real permalinks)",
  "Public byline is the desk credit (By the desk wordmark), not a staff name",
] as const;
