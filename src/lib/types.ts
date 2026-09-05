import type { SourceLane } from "@/lib/sites/types";

export type { SourceLane };

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
  /**
   * Editorial lane. Routing prefers this; Traverse source-id sets are fallback
   * when older KV rows omit it.
   */
  lane?: SourceLane;
  /** Place chip / reserved Around slots (e.g. Dexter). */
  place?: string;
  /** Higher = prefer on Around / sports ranking. */
  weight?: number;
  paywalled?: boolean;
  /** Volume-cap family key (e.g. eyes-only, official, upnorth). */
  family?: string;
  /** High-volume wire — cap like 9&10 / MLive. */
  heavy?: boolean;
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

/**
 * Movies + live theatre for /shows.
 * Stored separately from `events` so cinema grids never balloon What's on.
 * Never invent showtimes — `times` only holds clocks the source printed.
 */
export type ShowListing = {
  id: string;
  title: string;
  /** Venue display name (State Theatre, Elk Rapids Cinema, …). */
  venue: string;
  /**
   * Sort anchor. Date-only runs use midnight America/Detroit + time_unknown.
   * Never invent noon when the source omitted a clock.
   */
  starts_at: string;
  /** Optional end of run (ISO). Null/omitted when the source gave one day. */
  ends_at?: string | null;
  /**
   * Clock labels as stated by the source (e.g. "1:00 PM", "Fri 7:00 pm").
   * Empty when the page gave dates without times — display must not guess.
   */
  times: string[];
  url: string | null;
  source_id: string;
  time_unknown?: boolean;
};

export type Subscriber = {
  email: string;
  created_at: string;
};

/** Opted out of the morning letter. Desk-only history — never mailed. */
export type UnsubscribedSubscriber = {
  email: string;
  unsubscribed_at: string;
  /** Original signup time when known (preserved on move). */
  created_at?: string;
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
  /**
   * Every desk row in this cluster (lead first). Used so a morning letter
   * that already mailed one desk can exclude the whole cluster, including
   * second-desk rewrites.
   */
  members?: Array<{ title: string; url: string }>;
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
  /** True only for a staff original, never a recap. */
  desk_original?: boolean;
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

/** Record that today's morning letter already went out (America/Detroit date). */
export type EmailLetterSendRecord = {
  sent_at: string;
  resend_id?: string;
  subject?: string;
};

/** Detroit date → one-off Send today addresses (not the live blast). */
export type EmailOneOffSendsRecord = {
  emails: string[];
  updated_at: string;
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
  /**
   * Frozen weather one-liner at letter build/send time
   * (e.g. "72° / 55° · rain likely"). Archive must not change later.
   */
  weather_line?: string | null;
  /**
   * Desk-typed morning-letter Resend subject for this date. When set (non-empty
   * after trim), preview / send-today / send-live use it instead of
   * `buildMorningLetterSubject`. Pull/snapshot rebuilds must preserve it.
   */
  subject_override?: string | null;
  /**
   * When true, Desk locked today’s Around slate. Pull/snapshot must keep
   * `around` (and this flag) instead of auto-rebuilding bay cards. Clear via
   * Desk “Reset to auto” / POST cards with around: null.
   */
  around_locked?: boolean;
};

/** Thin pointer for a section page photo header (bytes live in R2 or /art). */
export type SectionHeaderMeta = {
  src: string;
  alt: string;
  updated_at: string;
};

export type SectionHeaderId =
  | "whats-on"
  | "shows"
  | "sports"
  | "civic"
  | "schools"
  | "local";

export type SectionHeadersMap = Record<
  SectionHeaderId,
  SectionHeaderMeta | null
>;

/** Desk-editable static page copy (Events dek, About essay). */
export type PageCopy = {
  events_dek: string;
  about_title: string;
  about_dek: string;
  /** Markdown-lite: ## headings, blank-line paragraphs, [label](/path), **bold**. */
  about_body: string;
  updated_at: string | null;
};

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
  /**
   * Movies + live theatre for /shows. Not EventItems — never mix into
   * Tonight / What's on / civic.
   */
  shows: ShowListing[];
  /** Active morning-letter list. resolveLetterRecipients reads only this. */
  subscribers: Subscriber[];
  /**
   * Former signups who opted out. Desk history only — never mailed.
   * Missing on older KV blobs; normalize to [].
   */
  unsubscribed: UnsubscribedSubscriber[];
  /** Public tip form submissions. Newest first in Desk. */
  tips: Tip[];
  /** Reader event suggestions. Pending until Desk confirms into `events`. */
  event_tips: EventTip[];
  last_pull_at: string | null;
  editions: EditionSnapshot[];
  /** Morning-email letter archive (Detroit date keys). Not sent mail. */
  email_editions: EmailEditionSnapshot[];
  /**
   * Per-Detroit-date record that the public (live) morning letter already went out.
   * Also mirrored to a dedicated KV key for cheap cron reads.
   */
  email_letter_sends?: Record<string, EmailLetterSendRecord>;
  /**
   * Per-Detroit-date Nick-only 8am preview. Separate from live send —
   * preview must not block Desk from sending live later.
   */
  email_letter_previews?: Record<string, EmailLetterSendRecord>;
  /** Desk one-off Send today log, keyed by Detroit YYYY-MM-DD. */
  email_one_off_sends?: Record<string, EmailOneOffSendsRecord>;
  /** Desk originals workflow. Drafts are never public. */
  drafts: OriginalDraft[];
  /**
   * Photo headers for public section pages. Pointers only — never store
   * image bytes here (R2 / static /art). Homepage bay masthead is separate.
   */
  section_headers: SectionHeadersMap;
  /**
   * Desk-editable static page copy (Events dek, About essay, …).
   * Missing on older KV blobs; normalize via resolvePageCopy defaults.
   */
  page_copy?: PageCopy;
};
