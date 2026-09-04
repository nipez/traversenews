export const ANN_ARBOR_SCHOOL_DISTRICT_ORDER = [
  "AAPS",
  "Ypsilanti",
  "Saline",
  "Chelsea",
  "Dexter",
] as const;

export const ANN_ARBOR_SCHOOL_DISTRICT_CORE = [
  "AAPS",
  "Ypsilanti",
  "Saline",
  "Chelsea",
  "Dexter",
] as const;

export const ANN_ARBOR_SCHOOL_DISTRICT_CALENDAR_URLS: Record<string, string> = {
  AAPS: "https://www.a2schools.org/about-aaps/calendars",
  Ypsilanti: "https://www.ycschools.us/for-parents/calendar/",
  Saline: "https://www.salineschools.org/district-resources/calendar/",
  Chelsea: "https://www.chelseaschools.org/about-us/calendar",
  Dexter: "https://www.dexterschools.org/district/calendar",
};

export const ANN_ARBOR_SCHOOL_DISTRICT_CALENDAR_PDF_URLS: Record<string, string> =
  {};

export function annArborDistrictFromSourceId(sourceId: string): string | null {
  switch (sourceId) {
    case "src_aaps_cal":
      return "AAPS";
    case "src_ycs_cal":
      return "Ypsilanti";
    case "src_saline_cal":
      return "Saline";
    case "src_chelsea_cal":
      return "Chelsea";
    case "src_dexter_cal":
      return "Dexter";
    case "src_lincoln_cal":
      return "Lincoln";
    default:
      return null;
  }
}
