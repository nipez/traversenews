/**
 * Outbound Useful local / Going out — link only, never clone directories.
 * Nick locked this list; do not invent hours or listings.
 */
export type UsefulLocalLink = {
  href: string;
  label: string;
  /** One-line dek for About; omit from footer. */
  dek: string;
};

export const USEFUL_LOCAL: readonly UsefulLocalLink[] = [
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
  {
    href: "https://grandtraversebuilders.com/",
    label: "Builders",
    dek: "Trades directory, not news",
  },
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
  {
    href: "https://dennosmuseum.org/",
    label: "Dennos",
    dek: "Art museum on West Bay",
  },
] as const;

/**
 * Events “Going out” only — wine, happy hours, Nauti-Cat, Discovery Cruises.
 * Do not put builders, Sleeping Bear, TART, lighthouse, or Dennos here.
 */
export const GOING_OUT: readonly UsefulLocalLink[] = [
  USEFUL_LOCAL[0],
  USEFUL_LOCAL[1],
  USEFUL_LOCAL[2],
  USEFUL_LOCAL[3],
];
