import Link from "next/link";
import { DeskRail } from "@/components/DeskRail";
import { PublicShell } from "@/components/PublicShell";
import { SectionHero } from "@/components/SectionHero";
import { detroitDayKey, formatShowDateRange } from "@/lib/dates";
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

function firstClock(item: ShowListing): { clock: string; meridiem: string } {
  const raw = item.times[0]?.replace(/\s+/g, " ").trim() ?? "";
  if (!raw) return { clock: "—", meridiem: "" };
  const parts = raw.split(" ");
  const last = parts[parts.length - 1] ?? "";
  if (/^(AM|PM)$/i.test(last) && parts.length >= 2) {
    return { clock: parts.slice(0, -1).join(" "), meridiem: last };
  }
  return { clock: raw, meridiem: "" };
}

function extraWhen(item: ShowListing): string {
  const range = formatShowDateRange(item.starts_at, item.ends_at);
  const rest = item.times.slice(1);
  const bits = [range, rest.length ? rest.join(" · ") : ""].filter(Boolean);
  return bits.join(" · ");
}

function groupByStartDay(items: ShowListing[]) {
  const groups = new Map<string, ShowListing[]>();
  for (const item of items) {
    const key = detroitDayKey(item.starts_at);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, list]) => {
      const sorted = [...list].sort((a, b) => {
        const aT = a.times[0] ? 0 : 1;
        const bT = b.times[0] ? 0 : 1;
        if (aT !== bT) return aT - bT;
        return a.title.localeCompare(b.title);
      });
      const d = new Date(sorted[0].starts_at);
      const dayNum = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Detroit",
        day: "numeric",
      }).format(d);
      const dayLabel = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Detroit",
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(d);
      return { key, dayNum, dayLabel, items: sorted };
    });
}

export default async function ShowsPage() {
  const snap = await getShowsSnapshot();
  const headers = await getSectionHeadersSnapshot();
  const listings = snap.venues.flatMap((v) => v.listings);
  const byDay = groupByStartDay(listings);
  const todayKey = detroitDayKey(new Date());

  return (
    <PublicShell active="/shows" header="compact">
      <SectionHero
        kicker="On screen & stage"
        title="Shows"
        header={headers.headers.shows}
        dek="Movies and live theatre around the bay."
      />
      <div className="about-layout sports-layout">
        <div className="about-essay events-main">
          <div className="events-page">
            <div className="events-days">
              {byDay.map((group) => (
                <section
                  key={group.key}
                  className="events-day"
                  data-today={group.key === todayKey ? "true" : undefined}
                >
                  <header className="events-day-head">
                    <p className="events-day-num">{group.dayNum}</p>
                    <p className="events-day-label">{group.dayLabel}</p>
                  </header>
                  <ul className="events-day-grid">
                    {group.items.map((item) => {
                      const { clock, meridiem } = firstClock(item);
                      const extra = extraWhen(item);
                      return (
                        <li key={item.id} className="events-row">
                          <div className="events-row-when">
                            <p className="events-row-time">
                              {clock}
                              {meridiem ? (
                                <span className="events-row-meridiem">
                                  {" "}
                                  {meridiem}
                                </span>
                              ) : null}
                            </p>
                          </div>
                          <div className="events-row-copy">
                            <p className="events-row-venue">{item.venue}</p>
                            <h3 className="events-row-title">
                              {item.url ? (
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {item.title} ↗
                                </a>
                              ) : (
                                item.title
                              )}
                            </h3>
                            {extra ? (
                              <p className="events-row-venue">{extra}</p>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
              {byDay.length === 0 ? (
                <p className="events-empty">No listings yet.</p>
              ) : null}
            </div>
          </div>
          <p className="sports-foot">
            Also on <Link href="/events">Events</Link> /{" "}
            <Link href="/">Today</Link>.
          </p>
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
