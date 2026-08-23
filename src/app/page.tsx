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
    <PublicShell active="/">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
        <div className="min-w-0 space-y-10">
          {lead ? <LeadStory lead={lead} /> : null}

          {/* Mobile: night-out punch before the bay list */}
          <div className="lg:hidden">
            <TonightBlock events={weekendEvents} />
          </div>

          <AroundTheBay items={around} />

          <div className="space-y-8 lg:hidden">
            <CivicList events={civic} />
            <MorningScanSignup />
          </div>

          <hr className="rule" />
          <MoreFromUs stories={moreFromUs} />
        </div>

        <aside className="hidden space-y-8 lg:block">
          <TonightBlock events={weekendEvents} />
          <CivicList events={civic} />
          <MorningScanSignup />
        </aside>
      </div>
    </PublicShell>
  );
}
