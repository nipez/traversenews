/**
 * Section page photo headers (Events, Sports, Civic, Schools, Local).
 *
 * Hypothesis (storage): keep JPEG bytes out of fat `app_data` / public
 * snapshots to avoid Worker 1102 on save/rebuild. Prefer R2
 * (`TRAVERSE_MEDIA`) for uploads; AppData + `public:section-headers:v1`
 * hold thin `{ src, alt, updated_at }` pointers only. Homepage hero is
 * `home` in this map; an empty slot falls back to `site.hero`.
 */

import { getSite, getSiteId } from "@/lib/sites";
import type {
  SectionHeaderId,
  SectionHeaderMeta,
  SectionHeadersMap,
} from "@/lib/types";

export type { SectionHeaderId, SectionHeaderMeta, SectionHeadersMap };

export const SECTION_HEADER_IDS: readonly SectionHeaderId[] = [
  "home",
  "whats-on",
  "shows",
  "sports",
  "civic",
  "schools",
  "local",
] as const;

export const INTERIOR_SECTION_HEADER_IDS: readonly SectionHeaderId[] = [
  "whats-on",
  "shows",
  "sports",
  "civic",
  "schools",
  "local",
] as const;

const SECTION_HEADER_LABELS_BASE: Record<
  SectionHeaderId,
  { title: string; path: string; kicker: string }
> = {
  home: { title: "Home", path: "/", kicker: "Today" },
  "whats-on": { title: "Events", path: "/events", kicker: "Local happenings" },
  shows: { title: "Shows", path: "/shows", kicker: "On screen & stage" },
  sports: { title: "Sports", path: "/sports", kicker: "Scores & prep" },
  civic: { title: "Civic Calendar", path: "/civic", kicker: "Agenda" },
  schools: { title: "Schools", path: "/schools", kicker: "Parents" },
  local: { title: "Useful local", path: "/local", kicker: "Bay side" },
};

export function getSectionHeaderLabels(): Record<
  SectionHeaderId,
  { title: string; path: string; kicker: string }
> {
  return {
    ...SECTION_HEADER_LABELS_BASE,
    local: {
      ...SECTION_HEADER_LABELS_BASE.local,
      kicker: getSite().localKicker,
    },
  };
}

/** Traverse labels (kicker may be stale if SITE_ID is not traverse). Prefer getSectionHeaderLabels(). */
export const SECTION_HEADER_LABELS = SECTION_HEADER_LABELS_BASE;

/** Shipped seed art — Desk can replace without a code deploy once live. */
export const SECTION_HEADER_SEEDS: Partial<
  Record<SectionHeaderId, Omit<SectionHeaderMeta, "updated_at">>
> = {
  "whats-on": {
    src: "/art/events-header.jpg",
    alt: "Aerial shoreline: autumn forest, sandy beach, and turquoise water",
  },
  sports: {
    src: "/art/sports-header.jpg",
    alt: "Girls lacrosse on turf — white and gold vs black and blue",
  },
};

export function emptySectionHeaders(): SectionHeadersMap {
  return {
    home: null,
    "whats-on": null,
    shows: null,
    sports: null,
    civic: null,
    schools: null,
    local: null,
  };
}

/** Desk photo if set; otherwise the shipped site masthead (may be empty). */
export function resolveHomeHero(header: SectionHeaderMeta | null | undefined): {
  src: string;
  alt: string;
} {
  const site = getSite();
  if (header?.src?.trim()) {
    return {
      src: header.src.trim(),
      alt: header.alt?.trim() || site.hero.alt,
    };
  }
  return { src: site.hero.src, alt: site.hero.alt };
}

export function isSectionHeaderId(value: string): value is SectionHeaderId {
  return (SECTION_HEADER_IDS as readonly string[]).includes(value);
}

/** Merge seed defaults for empty slots; never overwrite Desk-set rows. */
export function withSectionHeaderSeeds(
  current: SectionHeadersMap | null | undefined,
  at = new Date().toISOString(),
): SectionHeadersMap {
  const base = current
    ? { ...emptySectionHeaders(), ...current }
    : emptySectionHeaders();
  // Bay photos stay on Traverse only.
  const seeds = getSiteId() === "ann-arbor" ? {} : SECTION_HEADER_SEEDS;
  for (const id of SECTION_HEADER_IDS) {
    if (base[id]) continue;
    const seed = seeds[id];
    if (!seed) continue;
    base[id] = { ...seed, updated_at: at };
  }
  return base;
}

export function r2ObjectKey(id: SectionHeaderId): string {
  return `section-headers/${id}`;
}

/** Cache-busting public path for an R2-backed header. */
export function mediaSectionPath(
  id: SectionHeaderId,
  updatedAt: string,
): string {
  const v = encodeURIComponent(updatedAt);
  return `/media/section/${id}?v=${v}`;
}
