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
  /** Official full calendar page/PDF for /schools (link out — do not host). */
  calendar_url?: string | null;
  /** Optional secondary PDF (e.g. TCAPS year PDF) — link out only. */
  calendar_pdf_url?: string | null;
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
  /**
   * True when the source gave a calendar date with no clock (e.g. "2026-08-23").
   * Display must not invent noon — show an em dash, not 12:00 PM.
   * starts_at is midnight America/Detroit for day sorting only.
   */
  time_unknown?: boolean;
};

/**
 * HS athletics slate for Sports This week (greater bay).
 * Stored separately from `events` so a season calendar cannot balloon /whats-on.
 */
export type AthleticsGame = {
  id: string;
  title: string;
  starts_at: string;
  place: string;
  url: string | null;
  source_id: string;
  /** Display label: Central, West, Elk Rapids, etc. */
  school: string;
  time_unknown?: boolean;
};

/**
 * District academic calendar rows for /schools (no-school, half days, breaks).
 * Never mixed into Events or Civic.
 */
export type SchoolCalendarItem = {
  id: string;
  title: string;
  starts_at: string;
  place: string;
  url: string | null;
  source_id: string;
  /** District label, e.g. TCAPS, Elk Rapids. */
  district: string;
  time_unknown?: boolean;
};

export type Subscriber = {
  email: string;
  created_at: string;
};

/** Reader tip / correction. Desk-only until staff act — never auto-published. */
export type Tip = {
  id: string;
  body: string;
  name: string | null;
  email: string | null;
  url: string | null;
  created_at: string;
};

/**
 * Reader-submitted night-out listing. Desk-only until confirmed.
 * Never auto-imported to public Events.
 */
export type EventTip = {
  id: string;
  title: string;
  /** Calendar date YYYY-MM-DD (America/Detroit). */
  date: string;
  /** Optional clock HH:mm. Null/empty → time_unknown on confirm (never invent noon). */
  time: string | null;
  place: string | null;
  url: string | null;
  note: string | null;
  name: string | null;
  email: string | null;
  created_at: string;
  status: "pending" | "confirmed" | "dismissed";
  /** EventItem id after confirm. */
  event_id: string | null;
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

/** Compact story card inside a morning-email letter snapshot. */
export type EmailStoryCard = {
  title: string;
  dek: string;
  url: string;
  sources: string[];
  /** Record-Eagle paywall honesty mark. */
  paywalled?: boolean;
};

export type EmailAlertCard = {
  title: string;
  dek: string;
  url: string;
  source_name: string;
};

export type EmailEventCard = {
  title: string;
  starts_at: string;
  place: string;
  url: string | null;
  time_unknown?: boolean;
};

export type EmailSportsCard = {
  title: string;
  starts_at: string;
  place: string;
  url: string | null;
  school: string;
  time_unknown?: boolean;
};

/**
 * Frozen morning-email letter for one America/Detroit date.
 * Separate from homepage `editions` — this is the letter, not the Today rail.
 */
export type EmailEditionSnapshot = {
  date: string;
  captured_at: string;
  lead: EmailStoryCard | null;
  around: EmailStoryCard[];
  alerts: EmailAlertCard[];
  tonight: EmailEventCard[];
  civic: EmailEventCard[];
  /** Optional varsity slate for This week (2–4). */
  sports: EmailSportsCard[];
};

/** Thin pointer for a section page photo header (bytes live in R2 or /art). */
export type SectionHeaderMeta = {
  src: string;
  alt: string;
  updated_at: string;
};

export type SectionHeaderId =
  | "whats-on"
  | "sports"
  | "civic"
  | "schools"
  | "local";

export type SectionHeadersMap = Record<
  SectionHeaderId,
  SectionHeaderMeta | null
>;

export type AppData = {
  beats: Beat[];
  sources: Source[];
  stories: Story[];
  events: EventItem[];
  /**
   * HS athletics games (greater bay). Not EventItems — never mix into
   * Tonight / What's on / civic.
   */
  athletics: AthleticsGame[];
  /**
   * District academic calendars for /schools. Not EventItems — never mix
   * into Tonight / What's on / civic.
   */
  schools: SchoolCalendarItem[];
  subscribers: Subscriber[];
  /** Public tip form submissions. Newest first in Desk. */
  tips: Tip[];
  /** Reader event suggestions. Pending until Desk confirms into `events`. */
  event_tips: EventTip[];
  last_pull_at: string | null;
  editions: EditionSnapshot[];
  /** Morning-email letter archive (Detroit date keys). Not sent mail. */
  email_editions: EmailEditionSnapshot[];
  /** Desk originals workflow. Drafts are never public. */
  drafts: OriginalDraft[];
  /**
   * Photo headers for public section pages. Pointers only — never store
   * image bytes here (R2 / static /art). Homepage bay masthead is separate.
   */
  section_headers: SectionHeadersMap;
};
