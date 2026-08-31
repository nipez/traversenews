/** City instance id. One Worker / KV / Desk catalog per id. */
export type SiteId = "traverse" | "ann-arbor";

/**
 * Editorial lane on a Source. Ranking and page routing prefer this;
 * Traverse hardcoded source-id sets remain as fallback.
 */
export type SourceLane =
  | "wire"
  | "alert"
  | "civic"
  | "events"
  | "school_cal"
  | "athletics"
  | "shows"
  | "original";

export type SiteHero = {
  src: string;
  alt: string;
  dateline: string;
  dek: string;
};

export type SitePageCopyDefaults = {
  eventsDek: string;
  aboutTitle: string;
  aboutDek: string;
  aboutBody: string;
};

export type NetworkCity = {
  id: SiteId;
  label: string;
  /** Public origin including protocol, no trailing slash. */
  origin: string;
};

export type SiteConfig = {
  id: SiteId;
  /** First half of the wordmark, e.g. "traverse". */
  wordmarkPrimary: string;
  /** TLD half, e.g. "news". */
  wordmarkTld: string;
  /** Hostname without protocol. */
  hostname: string;
  /** Default public origin when NEXT_PUBLIC_SITE_URL is unset. */
  defaultOrigin: string;
  /** Staff / From-name, e.g. "Traverse News". */
  name: string;
  place: string;
  placeState: string;
  /** Phrase in dek copy: "the bay" / "Ann Arbor and Dexter". */
  regionPhrase: string;
  aroundLabel: string;
  aroundEmoji: string;
  hero: SiteHero;
  timezone: string;
  /**
   * Cookie Domain attribute in production. Undefined on workers.dev / localhost
   * so the session stays host-only.
   */
  cookieDomain: string | undefined;
  emailFromName: string;
  emailFromAddress: string;
  emailFallback: string;
  publicByline: string;
  userAgent: string;
  fallbackPlace: string;
  gaId: string | null;
  /** True = cron/Desk preview only; no public blast until a cultivator is live. */
  letterPreviewOnly: boolean;
  description: string;
  localKicker: string;
  staffEmail: string;
  tipsEmail: string;
  /** Places that must keep reserved Around slots (e.g. Dexter). */
  reservedPlaces: string[];
  pageCopy: SitePageCopyDefaults;
};

export type SourceMeta = {
  lane?: SourceLane;
  place?: string;
  /** Higher = prefer on Around. */
  weight?: number;
  paywalled?: boolean;
  /** Family key for volume caps (e.g. "eyes-only"). */
  family?: string;
  /** High-volume wire — cap like 9&10 / MLive. */
  heavy?: boolean;
};
