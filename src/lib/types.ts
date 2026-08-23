export type PullMethod =
  | "rss"
  | "ics"
  | "html"
  | "facebook"
  | "original"
  | "none";

export type Beat = {
  id: string;
  name: string;
  slug: string;
  sort: number;
};

export type Source = {
  id: string;
  name: string;
  homepage: string;
  feed_url: string | null;
  pull_method: PullMethod;
  beat_id: string;
  enabled: boolean;
  notes: string;
  /** Last successful or attempted pull for this source (ISO). */
  last_pulled_at?: string | null;
  /** Last pull error message, if any. Cleared on success. */
  last_pull_error?: string | null;
};

export type Story = {
  id: string;
  source_id: string;
  title: string;
  dek: string;
  url: string;
  published_at: string;
  is_original: boolean;
  body: string | null;
  image_url: string | null;
  /** Optional credit line under the photo (originals only). */
  image_credit?: string | null;
  /** Optional caption under the photo (originals only). */
  image_caption?: string | null;
  byline: string | null;
  slug: string | null;
  /** Public kicker label (e.g. "Events"). Prefer over beat name when set. */
  section?: string | null;
  /** Permalinks shown on the public story as “From the local record”. */
  source_urls?: string[];
};

export type DraftStatus = "draft" | "published";

/** Staff original in Desk. Unpublished drafts never appear on the public site. */
export type OriginalDraft = {
  id: string;
  status: DraftStatus;
  title: string;
  dek: string;
  body: string;
  section: string | null;
  byline: string;
  slug: string | null;
  /** Optional staff photo URL. Empty = no image on public story/lead. */
  image_url: string | null;
  image_credit: string | null;
  image_caption: string | null;
  /** Permalinks the draft may draw facts from. Required. */
  source_urls: string[];
  based_on_story_ids: string[];
  source_title: string | null;
  source_dek: string | null;
  published_story_id: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

export type EventItem = {
  id: string;
  title: string;
  starts_at: string;
  place: string;
  url: string | null;
  source_id: string;
};

export type Subscriber = {
  email: string;
  created_at: string;
};

export type ClusteredStory = {
  id: string;
  title: string;
  dek: string;
  url: string;
  published_at: string;
  sources: Array<{ id: string; name: string }>;
  is_original: boolean;
  byline: string | null;
  slug: string | null;
  image_url: string | null;
  image_credit?: string | null;
  image_caption?: string | null;
  body: string | null;
};

/** Compact card stored in a day's edition (no third-party bodies). */
export type EditionStoryCard = {
  title: string;
  dek: string;
  url: string;
  published_at: string;
  sources: string[];
  byline: string | null;
  slug: string | null;
  is_original: boolean;
};

export type EditionEventCard = {
  title: string;
  starts_at: string;
  place: string;
  url: string | null;
};

export type EditionSnapshot = {
  date: string;
  captured_at: string;
  lead: EditionStoryCard | null;
  around: EditionStoryCard[];
  events: EditionEventCard[];
  civic: EditionEventCard[];
};

export type AppData = {
  beats: Beat[];
  sources: Source[];
  stories: Story[];
  events: EventItem[];
  subscribers: Subscriber[];
  last_pull_at: string | null;
  editions: EditionSnapshot[];
  /** Desk originals workflow. Drafts are never public. */
  drafts: OriginalDraft[];
};
