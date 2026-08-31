export const ANN_ARBOR_ATHLETICS_CORE_SOURCE_IDS = [
  "src_pioneer_ath",
  "src_skyline_ath",
  "src_huron_ath",
  "src_dexter_ath",
] as const;

export const ANN_ARBOR_ATHLETICS_CORE_SCHOOLS = [
  "Pioneer",
  "Skyline",
  "Huron",
  "Dexter",
] as const;

export const ANN_ARBOR_ATHLETICS_CORE_CHIPS = [
  {
    label: "Pioneer" as const,
    sourceId: "src_pioneer_ath",
    aliases: ["pioneer", "ann arbor pioneer"],
  },
  {
    label: "Skyline" as const,
    sourceId: "src_skyline_ath",
    aliases: ["skyline", "ann arbor skyline"],
  },
  {
    label: "Huron" as const,
    sourceId: "src_huron_ath",
    aliases: ["huron", "ann arbor huron"],
  },
  {
    label: "Dexter" as const,
    sourceId: "src_dexter_ath",
    aliases: ["dexter", "dexter high"],
  },
];
