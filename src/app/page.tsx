import { AroundTheBay } from "@/components/AroundTheBay";
import { CivicList } from "@/components/CivicList";
import { LeadStory } from "@/components/LeadStory";
import { PublicShell } from "@/components/PublicShell";
import { TonightBlock } from "@/components/TonightBlock";
import { getHomepageData } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { lead, around, weekendEvents, civic } = await getHomepageData();

  return (
    <PublicShell active="/" header="hero">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.85fr)] lg:items-start lg:gap-10">
        <div className="min-w-0">
          {lead ? <LeadStory lead={lead} /> : null}
          <AroundTheBay items={around} />
        </div>

        <aside className="flex min-w-0 flex-col gap-5">
          <TonightBlock events={weekendEvents} limit={4} />
          <CivicList
            events={civic}
            showStamp
            linkLabel="Full calendar"
            limit={5}
          />
        </aside>
      </div>
    </PublicShell>
  );
}
