import { DeskRail } from "@/components/DeskRail";
import { PublicShell } from "@/components/PublicShell";
import { SectionHero } from "@/components/SectionHero";
import { formatShowDateRange } from "@/lib/dates";
import {
  getSectionHeadersSnapshot,
  getShowsSnapshot,
} from "@/lib/public-snapshots";
import type { ShowListing } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Shows",
};

const VENUE_LINKS = [
  {
    name: "State Theatre / Bijou",
    href: "https://stateandbijou.org/",
  },
  {
    name: "The Bay Theatre",
    href: "https://thebaytheatre.org/",
  },
  {
    name: "Elk Rapids Cinema",
    href: "https://www.elkrapidscinema.com/",
  },
  {
    name: "AMC Cherry Blossom 14",
    href: "https://www.amctheatres.com/movie-theatres/traverse-city-mi/amc-cherry-blossom-14",
  },
  {
    name: "Old Town Playhouse",
    href: "https://www.oldtownplayhouse.com/",
  },
];

function ShowCard({ item }: { item: ShowListing }) {
  const when = formatShowDateRange(item.starts_at, item.ends_at);
  const times = item.times.length > 0 ? item.times.join(" · ") : null;
  const inner = (
    <>
      <h3 className="shows-title">{item.title}</h3>
      <div className="shows-meta">
        <span className="shows-when">{when}</span>
        {times ? <span className="shows-times">{times}</span> : null}
      </div>
      <p className="shows-venue-credit">{item.venue}</p>
    </>
  );

  if (item.url) {
    return (
      <li className="shows-item">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shows-item-link"
        >
          {inner}
        </a>
      </li>
    );
  }

  return <li className="shows-item shows-item-nolink">{inner}</li>;
}

export default async function ShowsPage() {
  const snap = await getShowsSnapshot();
  const headers = await getSectionHeadersSnapshot();
  const anyListings = snap.venues.some((v) => v.listings.length > 0);

  return (
    <PublicShell active="/shows" header="compact">
      <div className="about-layout shows-layout">
        <div className="about-essay shows-main">
          <SectionHero
            kicker="On screen & stage"
            title="Shows"
            header={headers.headers.shows}
            dek="Movies and live theatre around the bay. Listings credit the venue and link out. If a source page does not print a time, we leave it blank."
          />

          {!anyListings ? (
            <p className="shows-empty">
              No showtimes in the pull yet. Venue pages are linked below — we do
              not invent titles or clocks.
            </p>
          ) : null}

          <div className="shows-venues">
            {snap.venues.map((venue) => (
              <section key={venue.source_id} className="shows-venue">
                <div className="shows-venue-head">
                  <h2 className="shows-venue-hed">{venue.name}</h2>
                  <a
                    href={venue.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shows-venue-link"
                  >
                    Venue site ↗
                  </a>
                </div>
                {venue.listings.length === 0 ? (
                  <p className="shows-venue-empty">
                    No listings yet from this venue.
                  </p>
                ) : (
                  <ul className="shows-list">
                    {venue.listings.map((item) => (
                      <ShowCard key={item.id} item={item} />
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </div>

        <DeskRail
          active="/shows"
          outboundLinks={VENUE_LINKS}
          outboundKicker="Venues"
        />
      </div>
    </PublicShell>
  );
}
