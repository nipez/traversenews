import Link from "next/link";
import { DeskRail } from "@/components/DeskRail";
import { PublicShell } from "@/components/PublicShell";
import { SectionHero } from "@/components/SectionHero";
import {
  detroitDayKey,
  formatCivicDate,
  formatShowDateRange,
  parseEventStartsAt,
} from "@/lib/dates";
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

function runRange(item: ShowListing): string | null {
  if (!item.ends_at) return null;
  if (detroitDayKey(item.ends_at) === detroitDayKey(item.starts_at)) return null;
  return formatShowDateRange(item.starts_at, item.ends_at);
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
    .map(([key, list]) => ({
      key,
      dayLabel: labelFromDayKey(key),
      items: [...list].sort((a, b) => a.title.localeCompare(b.title)),
    }));
}

function ShowAgenda({
  groups,
  empty,
}: {
  groups: ReturnType<typeof groupByStartDay>;
  empty?: string;
}) {
  if (groups.length === 0) {
    return empty ? <li className="civic-empty">{empty}</li> : null;
  }
  return (
    <>
      {groups.map((group) => (
        <ShowDay key={group.key} group={group} />
      ))}
    </>
  );
}

function ShowDay({
  group,
}: {
  group: ReturnType<typeof groupByStartDay>[number];
}) {
  return (
    <>
      <li className="civic-month-hed">{group.dayLabel}</li>
      {group.items.map((item) => {
        const d = formatCivicDate(item.starts_at);
        const range = runRange(item);
        const title = item.url ? (
          <a href={item.url} target="_blank" rel="noopener noreferrer">
            {item.title}
          </a>
        ) : (
          item.title
        );
        return (
          <li key={item.id} className="civic-agenda-row">
            <div className="civic-datebox">
              <div className="civic-datebox-dow">{d.day}</div>
              <div className="civic-datebox-day">{d.label}</div>
              <div className="civic-datebox-month">{d.monthAbbr}</div>
            </div>
            <div className="civic-agenda-copy">
              <p className="civic-agenda-title">{title}</p>
              <p className="civic-agenda-place">{item.venue}</p>
              {range ? <p className="civic-agenda-place">{range}</p> : null}
            </div>
          </li>
        );
      })}
    </>
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
      <div className="about-layout civic-layout">
        <div className="about-essay civic-main">
          {byDay.length === 0 ? (
            <ul className="civic-agenda">
              <li className="civic-empty">No listings yet.</li>
            </ul>
          ) : (
            <>
              <ul className="civic-agenda">
                <li className="civic-month-hed">This week</li>
                <ShowAgenda
                  groups={thisWeek}
                  empty="No movies or plays this week."
                />
              </ul>
              {coming.length > 0 ? (
                <ul className="civic-agenda">
                  <li className="civic-month-hed">Coming up</li>
                  <ShowAgenda groups={coming} />
                </ul>
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
