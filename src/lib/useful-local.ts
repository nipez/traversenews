/**
 * Outbound Useful local / Going out — link only, never clone directories.
 * Nick locked this list; do not invent hours or listings.
 */
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

export const LOCAL_GROUPS: readonly LocalGroup[] = [
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
 * Events “Going out” chip — wine, happy hours, two boats only.
 * Do not put builders, Sleeping Bear, TART, lighthouse, or Dennos here.
 */
export const GOING_OUT: readonly UsefulLocalLink[] =
  LOCAL_GROUPS[0].links;
