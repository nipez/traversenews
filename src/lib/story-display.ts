import type { Beat, Source, Story } from "@/lib/types";

const WPM = 220;

/** Minutes to read from body word count; null if under a minute or empty. */
export function readTimeMinutes(body: string | null | undefined): number | null {
  if (!body?.trim()) return null;
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.round(words / WPM);
  return minutes >= 1 ? minutes : null;
}

/**
 * Section kicker for an original: story.section, else the source beat name
 * (skipping the generic "Original" beat).
 */
export function storySectionLabel(
  story: Story,
  sources: Source[],
  beats: Beat[],
): string | null {
  const fromStory = story.section?.trim();
  if (fromStory) return fromStory;

  const source = sources.find((s) => s.id === story.source_id);
  if (!source) return null;
  const beat = beats.find((b) => b.id === source.beat_id);
  if (!beat) return null;
  if (beat.slug === "original" || beat.slug === "all") return null;
  return beat.name;
}

/** True when the paragraph is itself a quotation (pull-quote candidate). */
export function isQuotedParagraph(paragraph: string): boolean {
  const t = paragraph.trim();
  if (t.length < 12) return false;
  const opens = t.startsWith('"') || t.startsWith("\u201C") || t.startsWith("'");
  const closes =
    t.endsWith('"') ||
    t.endsWith("\u201D") ||
    t.endsWith("'") ||
    /["\u201D']\s*$/.test(t);
  return opens && closes;
}

export function stripOuterQuotes(paragraph: string): string {
  return paragraph.trim().replace(/^["'\u201C]|["'\u201D]$/g, "");
}
