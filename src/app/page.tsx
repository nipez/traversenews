import { AroundTheBay } from "@/components/AroundTheBay";
import { CivicList } from "@/components/CivicList";
import { LeadStory } from "@/components/LeadStory";
import { MoreFromUs } from "@/components/MoreFromUs";
import { MorningScanSignup } from "@/components/MorningScanSignup";
import { PublicShell } from "@/components/PublicShell";
import { TonightBlock } from "@/components/TonightBlock";
import { getHomepageData } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { lead, around, moreFromUs, weekendEvents, civic } =
    await getHomepageData();

  return (
    <PublicShell active="/" wide>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)] lg:items-start lg:gap-14">
        <div className="min-w-0">
          {lead ? <LeadStory lead={lead} /> : <AroundTheBay items={around} />}
        </div>
        <div className="min-w-0">
          <TonightBlock events={weekendEvents} />
        </div>
      </div>

      {lead ? (
        <div className="mt-14 md:mt-16">
          <AroundTheBay items={around} />
        </div>
      ) : null}

      <div className="mt-14 grid gap-10 border-t border-ink/15 pt-10 md:mt-16 md:grid-cols-[minmax(0,1fr)_300px] md:gap-12">
        <MoreFromUs stories={moreFromUs} />
        <div className="space-y-8">
          <CivicList events={civic} />
          <MorningScanSignup />
        </div>
      </div>
    </PublicShell>
  );
}
