import { AlertsStrip } from "@/components/AlertsStrip";
import { CivicList } from "@/components/CivicList";
import { MorningScanSignup } from "@/components/MorningScanSignup";
import { TonightBlock } from "@/components/TonightBlock";
import {
  getHomeSnapshot,
  homeRailFromSnapshot,
} from "@/lib/public-snapshots";

/**
 * Shared public interior right rail — same stack on every interior page.
 * Alerts (if any) → Tonight → Civic next meetings → morning email tease.
 * Data from the home public snapshot only (one well-known KV get, no list()).
 */
export async function InteriorRail() {
  const home = await getHomeSnapshot();
  const { alerts, tonight, civic } = homeRailFromSnapshot(home);

  return (
    <aside className="home-rail interior-rail" aria-label="Alongside">
      <AlertsStrip items={alerts} />
      <TonightBlock events={tonight} limit={4} />
      <CivicList
        events={civic}
        showStamp
        linkLabel="Full calendar"
        limit={5}
      />
      <MorningScanSignup variant="teal" />
    </aside>
  );
}
