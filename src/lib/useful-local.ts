/**
 * Outbound directories Nick maintains elsewhere — link only, never clone.
 */
export type UsefulLocalLink = {
  href: string;
  label: string;
  /** One-line dek for About; omit from footer chips. */
  dek: string;
};

export const USEFUL_LOCAL: readonly UsefulLocalLink[] = [
  {
    href: "https://traversecitywinetour.com/",
    label: "Wine country",
    dek: "Old Mission and Leelanau wine trails — 40+ wineries.",
  },
  {
    href: "https://michiganhappyhour.com/",
    label: "Happy hours",
    dek: "Happy-hour directory for Michigan nights out.",
  },
  {
    href: "https://grandtraversebuilders.com/",
    label: "Builders",
    dek: "Builders and trades across eight Grand Traverse counties.",
  },
] as const;

/** Events “Going out” — wine + happy hours only (not builders). */
export const GOING_OUT: readonly UsefulLocalLink[] = [
  USEFUL_LOCAL[0],
  USEFUL_LOCAL[1],
];
