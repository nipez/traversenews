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
      {/* Lead + first-class Events / Civic Calendar — before the bay feed */}
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start lg:gap-12">
        <div className="min-w-0 anim-rise">
          {lead ? <LeadStory lead={lead} /> : <AroundTheBay items={around} />}
        </div>
        <div className="grid min-w-0 gap-8 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <TonightBlock events={weekendEvents} />
          <CivicList
            events={civic}
            showStamp
            linkLabel="Full calendar"
            className="anim-fade anim-delay-1"
          />
        </div>
      </div>

      {lead ? (
        <div className="mt-14 md:mt-16">
          <AroundTheBay items={around} />
        </div>
      ) : null}

      <div className="mt-14 grid gap-10 border-t border-ink/20 pt-10 md:mt-16 md:grid-cols-[minmax(0,1fr)_300px] md:gap-12">
        <MoreFromUs stories={moreFromUs} />
        <MorningScanSignup />
      </div>
    </PublicShell>
  );
}
