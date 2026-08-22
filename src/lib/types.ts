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
  byline: string | null;
  slug: string | null;
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
};
