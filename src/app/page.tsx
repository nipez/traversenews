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
      <div className="home-grid">
        <div className="home-main">
          {lead ? <LeadStory lead={lead} /> : null}
          <AroundTheBay items={around} />
        </div>
        <aside className="home-rail">
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
