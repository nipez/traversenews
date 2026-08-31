import type { OriginalDraft } from "@/lib/types";

/** Staff drafts that must stay Desk-only until Nick publishes. */
export const STAFF_UNPUBLISHED_DRAFTS: OriginalDraft[] = [];

/**
 * Nick already published these originals. ensurePublishedStaffOriginals may
 * repair a missing is_original Story only when the draft is already
 * status===published — it must never upgrade draft/unpublished → published.
 *
 * Empty on purpose: do not auto-seed Center Road / Seeburger (or any other
 * piece) back onto the public site. See KILLED_ORIGINAL_SLUGS in scrub.ts.
 */
export const STAFF_PUBLISHED_ORIGINALS: OriginalDraft[] = [];
