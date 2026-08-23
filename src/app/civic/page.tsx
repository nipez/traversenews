import Image from "next/image";
import { CivicList } from "@/components/CivicList";
import { PublicShell } from "@/components/PublicShell";
import { getAppData } from "@/lib/data/store";
import { civicEvents } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Civic Calendar",
};

export default async function CivicPage() {
  const data = await getAppData();
  const events = civicEvents(data.events, data.sources);

  return (
    <PublicShell active="/civic">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-start gap-4">
          <Image
            src="/art/stamp-civic.png"
            alt=""
            width={88}
            height={88}
            className="section-stamp shrink-0"
          />
          <div>
            <p className="text-[0.7rem] font-bold tracking-[0.14em] text-muted-2 uppercase">
              Agenda
            </p>
            <h1 className="mt-2 font-serif text-[2.2rem] leading-none tracking-tight text-ink md:text-[2.5rem]">
              Civic Calendar
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#555]">
              City, county, and school board meetings. Concerts and markets are
              on Events.
            </p>
          </div>
        </div>
        <div className="mt-8 border border-ink p-4 md:p-5">
          <CivicList events={events} linkLabel="Calendar" />
        </div>
      </div>
    </PublicShell>
  );
}
