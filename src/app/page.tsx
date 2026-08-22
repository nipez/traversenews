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

  function SideWidgets() {
    return (
      <>
        <TonightBlock events={weekendEvents} />
        <CivicList events={civic} />
        <MorningScanSignup />
      </>
    );
  }

  return (
    <PublicShell active="/">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-10">
          {lead ? <LeadStory lead={lead} /> : null}
          <hr className="rule hidden md:block" />
          <AroundTheBay items={around} />
          <div className="space-y-8 lg:hidden">
            <SideWidgets />
          </div>
          <hr className="rule" />
          <MoreFromUs stories={moreFromUs} />
        </div>

        <aside className="hidden space-y-8 lg:block">
          <SideWidgets />
        </aside>
      </div>
    </PublicShell>
  );
}
