import { DeskRail } from "@/components/DeskRail";
import { PublicShell } from "@/components/PublicShell";
import { SectionHero } from "@/components/SectionHero";
import { SchoolsDistrictToggle } from "@/components/SchoolsDistrictToggle";
import {
  getSchoolsSnapshot,
  getSectionHeadersSnapshot,
} from "@/lib/public-snapshots";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Schools",
};

export default async function SchoolsPage() {
  const snap = await getSchoolsSnapshot();
  const headers = await getSectionHeadersSnapshot();

  return (
    <PublicShell active="/schools" header="compact">
      <div className="about-layout schools-layout">
        <div className="about-essay schools-main">
          <SectionHero
            kicker="Parents"
            title="Schools"
            header={headers.headers.schools}
            dek="Important dates by district — half days, no-school, orientation, conferences, spring break, first and last day. Not PTA nights, not sports, not every elementary listing. We do not invent half days."
          />

          <SchoolsDistrictToggle districts={snap.districts} />
        </div>

        <DeskRail active="/schools" />
      </div>
    </PublicShell>
  );
}
