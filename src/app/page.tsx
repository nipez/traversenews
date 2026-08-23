import { AlertsStrip } from "@/components/AlertsStrip";
import { AroundTheBay } from "@/components/AroundTheBay";
import { CivicList } from "@/components/CivicList";
import { LeadStory } from "@/components/LeadStory";
import { PublicShell } from "@/components/PublicShell";
import { TonightBlock } from "@/components/TonightBlock";
import { getHomepageData } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { lead, around, weekendEvents, civic, alerts, yesterdayEditionDate } =
    await getHomepageData();

  return (
    <PublicShell
      active="/"
      header="hero"
      yesterdayEditionDate={yesterdayEditionDate}
    >
      <div className="home-grid">
        <div className="home-main">
          {lead ? <LeadStory lead={lead} /> : null}
          <AroundTheBay items={around} />
        </div>
        <aside className="home-rail">
          <AlertsStrip items={alerts} />
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
