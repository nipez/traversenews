import { CivicList } from "@/components/CivicList";
import { PublicShell } from "@/components/PublicShell";
import { getAppData } from "@/lib/data/store";
import { civicEvents } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Civic",
};

export default async function CivicPage() {
  const data = await getAppData();
  const events = civicEvents(data.events, data.sources);

  return (
    <PublicShell active="/civic">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-serif text-3xl text-ink md:text-4xl">Civic</h1>
        <p className="mt-2 text-[#444]">
          City, county, and school meetings in the next stretch of the calendar.
        </p>
        <div className="mt-8 border border-rule bg-white/50 p-5">
          <CivicList events={events} linkLabel="Calendar" />
        </div>
      </div>
    </PublicShell>
  );
}
