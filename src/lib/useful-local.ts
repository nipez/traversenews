/**
 * Outbound Useful local / Going out — link only, never clone directories.
 * Traverse list is Nick-locked; Ann Arbor list is official directories only.
 * Do not invent hours or listings.
 */
import { getSiteId } from "@/lib/sites";
import { ANN_ARBOR_GOING_OUT, ANN_ARBOR_LOCAL_GROUPS } from "@/lib/sites/ann-arbor/useful-local";

export type UsefulLocalLink = {
  href: string;
  label: string;
  /** One-line dek on /local. */
  dek: string;
};

export type LocalGroup = {
  id: string;
  title: string;
  links: readonly UsefulLocalLink[];
};

const TRAVERSE_LOCAL_GROUPS: readonly LocalGroup[] = [
  {
    id: "going-out",
    title: "Going out",
    links: [
      {
        href: "https://traversecitywinetour.com/",
        label: "Wine country",
        dek: "Old Mission and Leelanau trails",
      },
      {
        href: "https://michiganhappyhour.com/",
        label: "Happy hours",
        dek: "Happy-hour directory",
      },
      {
        href: "https://www.nauti-cat.com/",
        label: "Nauti-Cat",
        dek: "Sail Grand Traverse Bay",
      },
      {
        href: "https://www.discoverycruisestc.com/",
        label: "Discovery Cruises",
        dek: "Boat tours on the bay",
      },
    ],
  },
  {
    id: "outdoors",
    title: "Outdoors",
    links: [
      {
        href: "https://www.nps.gov/slbe/",
        label: "Sleeping Bear",
        dek: "Official NPS",
      },
      {
        href: "https://traversetrails.org/",
        label: "TART Trails",
        dek: "Bike and walking trails",
      },
      {
        href: "https://missionpointlighthouse.com/",
        label: "Mission Point Lighthouse",
        dek: "Old Mission Peninsula lighthouse",
      },
    ],
  },
  {
    id: "also",
    title: "Also",
    links: [
      {
        href: "https://grandtraversebuilders.com/",
        label: "Builders",
        dek: "Trades directory, not news",
      },
      {
        href: "https://dennosmuseum.org/",
        label: "Dennos",
        dek: "Art museum on West Bay",
      },
    ],
  },
] as const;

/**
 * Events dek line — wine, happy hours, two boats only (+ /local).
 * Editorial sentence under the Events dek, not a promo chip strip.
 * Do not put builders, Sleeping Bear, TART, lighthouse, or Dennos here.
 */
const TRAVERSE_GOING_OUT: readonly UsefulLocalLink[] =
  TRAVERSE_LOCAL_GROUPS[0].links;

export function getLocalGroups(): readonly LocalGroup[] {
  return getSiteId() === "ann-arbor"
    ? ANN_ARBOR_LOCAL_GROUPS
    : TRAVERSE_LOCAL_GROUPS;
}

export function getGoingOut(): readonly UsefulLocalLink[] {
  return getSiteId() === "ann-arbor" ? ANN_ARBOR_GOING_OUT : TRAVERSE_GOING_OUT;
}

/** @deprecated use getLocalGroups() — Traverse default for existing imports. */
export const LOCAL_GROUPS = TRAVERSE_LOCAL_GROUPS;

/** @deprecated use getGoingOut() */
export const GOING_OUT = TRAVERSE_GOING_OUT;
