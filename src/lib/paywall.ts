import type { ClusteredStory } from "@/lib/types";

/** Record-Eagle paywall sources (metered CNHI). Headlines + RSS dek + link only. */
export const RECORD_EAGLE_SOURCE_IDS = new Set([
  "src_re",
  "src_re_sports",
  "src_re_prep",
]);

export function isRecordEagleSourceId(id: string): boolean {
  return RECORD_EAGLE_SOURCE_IDS.has(id);
}

export function isRecordEagleName(name: string): boolean {
  return /record-eagle/i.test(name);
}

export function isRecordEagleUrl(url: string): boolean {
  try {
    return new URL(url).hostname.replace(/^www\./, "").includes("record-eagle.com");
  } catch {
    return false;
  }
}

/** True when the cluster’s primary outlet is Record-Eagle (any RE beat). */
export function isRecordEagleCluster(cluster: ClusteredStory): boolean {
  return cluster.sources.some(
    (s) =>
      isRecordEagleSourceId(s.id) ||
      isRecordEagleName(s.name) ||
      isRecordEagleUrl(cluster.url),
  );
}

export function isRecordEagleStory(input: {
  source_id: string;
  source_name?: string;
  url?: string;
}): boolean {
  if (isRecordEagleSourceId(input.source_id)) return true;
  if (input.source_name && isRecordEagleName(input.source_name)) return true;
  if (input.url && isRecordEagleUrl(input.url)) return true;
  return false;
}
