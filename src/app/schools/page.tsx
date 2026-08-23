import { InteriorLayout } from "@/components/InteriorLayout";
import { PublicShell } from "@/components/PublicShell";
import { SchoolsDistrictToggle } from "@/components/SchoolsDistrictToggle";
import { getSchoolsSnapshot } from "@/lib/public-snapshots";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Schools",
};

export default async function SchoolsPage() {
  const snap = await getSchoolsSnapshot();

  return (
    <PublicShell active="/schools" header="compact">
      <InteriorLayout
        mainClassName="schools-main"
        layoutClassName="schools-layout"
      >
        <header className="schools-hero">
          <p className="schools-kicker">Parents</p>
          <h1 className="schools-hed">Schools</h1>
          <p className="schools-dek">
            Important dates by district — half days, no-school, orientation,
            conferences, spring break, first and last day. Not PTA nights, not
            sports, not every elementary listing. We do not invent half days.
          </p>
        </header>

        <SchoolsDistrictToggle districts={snap.districts} />
      </InteriorLayout>
    </PublicShell>
  );
}
