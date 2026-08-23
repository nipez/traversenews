import { DeskRail } from "@/components/DeskRail";
import { PublicShell } from "@/components/PublicShell";
import { SchoolsDistrictToggle } from "@/components/SchoolsDistrictToggle";
import { getAppData } from "@/lib/data/store";
import {
  groupSchoolDaysByDistrict,
  SCHOOL_DISTRICT_CALENDAR_PDF_URLS,
  SCHOOL_DISTRICT_CALENDAR_URLS,
  selectUpcomingSchoolDays,
  sourceIdForDistrict,
} from "@/lib/schools";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Schools",
};

export default async function SchoolsPage() {
  const data = await getAppData();
  const upcoming = selectUpcomingSchoolDays(data.schools ?? []);
  const grouped = groupSchoolDaysByDistrict(upcoming, { includeEmpty: false });

  const districts = grouped.map((block) => {
    const sourceId = sourceIdForDistrict(block.district);
    const source = sourceId
      ? data.sources.find((s) => s.id === sourceId)
      : undefined;
    const calendarUrl =
      source?.calendar_url ||
      SCHOOL_DISTRICT_CALENDAR_URLS[block.district] ||
      null;
    const calendarPdfUrl =
      source?.calendar_pdf_url ||
      SCHOOL_DISTRICT_CALENDAR_PDF_URLS[block.district] ||
      null;
    return {
      district: block.district,
      calendarUrl,
      calendarPdfUrl,
      months: block.months,
    };
  });

  return (
    <PublicShell active="/schools" header="compact">
      <div className="about-layout schools-layout">
        <div className="about-essay schools-main">
          <header className="schools-hero">
            <p className="schools-kicker">Parents</p>
            <h1 className="schools-hed">Schools</h1>
            <p className="schools-dek">
              Important dates by district — half days, no-school, orientation,
              conferences, spring break, first and last day. Not PTA nights,
              not sports, not every elementary listing. We do not invent half
              days.
            </p>
          </header>

          <SchoolsDistrictToggle districts={districts} />
        </div>

        <DeskRail active="/schools" />
      </div>
    </PublicShell>
  );
}
