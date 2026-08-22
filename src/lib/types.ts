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

export type AppData = {
  beats: Beat[];
  sources: Source[];
  stories: Story[];
  events: EventItem[];
  subscribers: Subscriber[];
  last_pull_at: string | null;
};
