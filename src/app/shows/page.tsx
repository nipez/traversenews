import Link from "next/link";
import { DeskRail } from "@/components/DeskRail";
import { PublicShell } from "@/components/PublicShell";
import { SectionHero } from "@/components/SectionHero";
import { detroitDayKey, formatShowDateRange, parseEventStartsAt } from "@/lib/dates";
import {
  getSectionHeadersSnapshot,
  getShowsSnapshot,
} from "@/lib/public-snapshots";
import { printedClockMinutes, sortPrintedShowTimes } from "@/lib/shows";
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

function dayClocks(item: ShowListing): string[] {
  return sortPrintedShowTimes(item.times);
}

/** Earliest printed clock that day. Never invent a showtime. */
function firstClock(item: ShowListing): string {
  if (item.time_unknown) return "—";
  return dayClocks(item)[0] || "—";
}

function extraWhen(item: ShowListing): string {
  const bits: string[] = [];
  if (item.ends_at) {
    const startDay = detroitDayKey(item.starts_at);
    const endDay = detroitDayKey(item.ends_at);
    if (endDay !== startDay) {
      const range = formatShowDateRange(item.starts_at, item.ends_at);
      const startOnly = formatShowDateRange(item.starts_at);
      if (range !== startOnly) bits.push(range);
    }
  }
  const rest = dayClocks(item).slice(1);
  if (rest.length) bits.push(rest.join(" · "));
  return bits.join(" · ");
}

function labelFromDayKey(key: string): string {
  const noon = parseEventStartsAt(`${key}T12:00`);
  const d = noon ?? new Date(`${key}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Detroit",
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(d);
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
        const am = printedClockMinutes(firstClock(a));
        const bm = printedClockMinutes(firstClock(b));
        if (am == null && bm == null) return a.title.localeCompare(b.title);
        if (am == null) return 1;
        if (bm == null) return -1;
        if (am !== bm) return am - bm;
        return a.title.localeCompare(b.title);
      });
      return { key, dayLabel: labelFromDayKey(key), items: sorted };
    });
}

function ShowDayList({
  groups,
  empty,
}: {
  groups: ReturnType<typeof groupByStartDay>;
  empty?: string;
}) {
  if (groups.length === 0) {
    return empty ? <p className="sports-week-empty">{empty}</p> : null;
  }
  return (
    <div className="sports-week-days">
      {groups.map((group) => (
        <div key={group.key} className="sports-week-day">
          <h3 className="sports-week-day-label">{group.dayLabel}</h3>
          <ul className="sports-week-list">
            {group.items.map((item) => {
              const time = firstClock(item);
              const extra = extraWhen(item);
              const inner = (
                <>
                  <span className="sports-week-time">{time}</span>
                  <span className="sports-week-school">{item.venue}</span>
                  <span className="sports-week-title">{item.title}</span>
                  {extra ? (
                    <span className="sports-week-place">{extra}</span>
                  ) : null}
                </>
              );
              return (
                <li key={item.id} className="sports-week-item">
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sports-week-link"
                    >
                      {inner}
                    </a>
                  ) : (
                    <div className="sports-week-link sports-week-nolink">
                      {inner}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default async function ShowsPage() {
  const snap = await getShowsSnapshot();
  const headers = await getSectionHeadersSnapshot();
  const listings = snap.venues.flatMap((v) => v.listings);
  const byDay = groupByStartDay(listings);
  const now = new Date();
  const weekEndKey = detroitDayKey(
    new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  );
  const thisWeek = byDay.filter((g) => g.key <= weekEndKey);
  const coming = byDay.filter((g) => g.key > weekEndKey);

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
          {byDay.length === 0 ? (
            <p className="sports-week-empty">No listings yet.</p>
          ) : (
            <>
              <h2 className="sports-week-hed">This week</h2>
              <ShowDayList
                groups={thisWeek}
                empty="No movies or plays this week."
              />
              {coming.length > 0 ? (
                <>
                  <h2 className="sports-week-hed sports-week-hed-next">
                    Coming up
                  </h2>
                  <ShowDayList groups={coming} />
                </>
              ) : null}
            </>
          )}
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
