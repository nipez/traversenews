export const ANN_ARBOR_SCHOOL_DISTRICT_ORDER = ["AAPS", "Dexter"] as const;

export const ANN_ARBOR_SCHOOL_DISTRICT_CORE = ["AAPS", "Dexter"] as const;

export const ANN_ARBOR_SCHOOL_DISTRICT_CALENDAR_URLS: Record<string, string> = {
  AAPS: "https://www.a2schools.org/about-aaps/calendars",
  Dexter: "https://www.dcsd.org/calendar",
};

export const ANN_ARBOR_SCHOOL_DISTRICT_CALENDAR_PDF_URLS: Record<string, string> =
  {};

export function annArborDistrictFromSourceId(sourceId: string): string | null {
  switch (sourceId) {
    case "src_aaps_cal":
      return "AAPS";
    case "src_dexter_cal":
      return "Dexter";
    default:
      return null;
  }
}
