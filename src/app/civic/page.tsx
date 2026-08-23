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
        <p className="text-[0.72rem] font-bold tracking-[0.14em] text-muted-2 uppercase">
          Agenda
        </p>
        <h1 className="mt-2 font-serif text-[2.1rem] leading-none tracking-tight text-ink md:text-[2.4rem]">
          Civic
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#555]">
          City, county, and school board meetings. Concerts and markets are on
          What&apos;s on.
        </p>
        <div className="mt-8 border border-rule bg-paper-2/60 px-4 py-2">
          <CivicList events={events} linkLabel="Calendar" />
        </div>
      </div>
    </PublicShell>
  );
}
