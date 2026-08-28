import { DeskRail } from "@/components/DeskRail";
import { EventTipsForm } from "@/components/EventTipsForm";
import { PublicShell } from "@/components/PublicShell";
import { SectionHero } from "@/components/SectionHero";
import { detroitDayKey, formatEventWhenParts } from "@/lib/dates";
import { venueKicker } from "@/lib/events";
import {
  getEventsSnapshot,
  getSectionHeadersSnapshot,
} from "@/lib/public-snapshots";
import type { EventItem } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Events",
};

function groupByDay(
  events: EventItem[],
): Array<{ key: string; dayLabel: string; items: EventItem[] }> {
  const groups = new Map<string, EventItem[]>();
  for (const event of events) {
    const key = detroitDayKey(event.starts_at);
    const list = groups.get(key) ?? [];
    list.push(event);
    groups.set(key, list);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, items]) => {
      const sorted = [...items].sort((a, b) => {
        if (Boolean(a.time_unknown) !== Boolean(b.time_unknown)) {
          return a.time_unknown ? 1 : -1;
        }
        return (
          new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
        );
      });
      const d = new Date(sorted[0].starts_at);
      const dayLabel = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Detroit",
        weekday: "long",
        month: "short",
        day: "numeric",
      }).format(d);
      return { key, dayLabel, items: sorted };
    });
}

function eventTime(event: EventItem): string {
  return formatEventWhenParts(event.starts_at, new Date(), {
    timeUnknown: event.time_unknown,
  }).time;
}

export default async function EventsPage() {
  const snap = await getEventsSnapshot();
  const headers = await getSectionHeadersSnapshot();
  const byDay = groupByDay(snap.upcoming);

  return (
    <PublicShell active="/events" header="compact">
      <SectionHero
        kicker="Local happenings"
        title="Events"
        header={headers.headers["whats-on"]}
        dek={
          <>
            Concerts, festivals, markets, library programs. Meetings live on{" "}
            <Link href="/civic" className="events-dek-link">
              Civic
            </Link>
            . Something missing?{" "}
            <a href="#event-tip" className="events-dek-link">
              Let us know
            </a>
          </>
        }
      />
      <div className="about-layout sports-layout">
        <div className="about-essay events-main">
          {byDay.length === 0 ? (
            <p className="sports-week-empty">No community listings yet.</p>
          ) : (
            <div className="sports-week-days">
              {byDay.map((group) => (
                <div key={group.key} className="sports-week-day">
                  <h3 className="sports-week-day-label">{group.dayLabel}</h3>
                  <ul className="sports-week-list">
                    {group.items.map((event) => {
                      const time = eventTime(event);
                      const inner = (
                        <>
                          <span className="sports-week-time">{time}</span>
                          <span className="sports-week-school">
                            {venueKicker(event.place)}
                          </span>
                          <span className="sports-week-title">
                            {event.title}
                          </span>
                        </>
                      );
                      return (
                        <li key={event.id} className="sports-week-item">
                          {event.url ? (
                            <a
                              href={event.url}
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
          )}

          <EventTipsForm />
        </div>
        <DeskRail active="/events" />
      </div>
    </PublicShell>
  );
}
