import Link from "next/link";
import { DeskRail } from "@/components/DeskRail";
import { PublicShell } from "@/components/PublicShell";
import { SectionHero } from "@/components/SectionHero";
import { ShowsVenueFilter } from "@/components/ShowsVenueFilter";
import { detroitDayKey } from "@/lib/dates";
import { getSite } from "@/lib/sites";
import {
  getSectionHeadersSnapshot,
  getShowsSnapshot,
} from "@/lib/public-snapshots";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Shows",
};

export default async function ShowsPage() {
  const snap = await getShowsSnapshot();
  const headers = await getSectionHeadersSnapshot();
  const listings = snap.venues.flatMap((v) => v.listings);
  const now = new Date();
  const weekEndKey = detroitDayKey(
    new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  );
  const thisWeek = listings.filter(
    (item) => detroitDayKey(item.starts_at) <= weekEndKey,
  );
  const coming = listings.filter(
    (item) => detroitDayKey(item.starts_at) > weekEndKey,
  );

  return (
    <PublicShell active="/shows" header="compact">
      <SectionHero
        kicker="On screen & stage"
        title="Shows"
        header={headers.headers.shows}
        dek={getSite().pageCopy.showsDek}
      />
      <div className="about-layout civic-layout">
        <div className="about-essay civic-main">
          {listings.length === 0 ? (
            <>
              <ul className="civic-agenda">
                <li className="civic-empty">No listings yet.</li>
              </ul>
              <p className="sports-foot">
                Also on <Link href="/events">Events</Link> /{" "}
                <Link href="/">Today</Link>.
              </p>
            </>
          ) : (
            <ShowsVenueFilter thisWeek={thisWeek} coming={coming} />
          )}
        </div>

        <DeskRail
          active="/shows"
          outboundLinks={getSite().showsVenueLinks}
          outboundKicker="Venues"
        />
      </div>
    </PublicShell>
  );
}
