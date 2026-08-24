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
import { GOING_OUT } from "@/lib/useful-local";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Events",
};

function groupByDay(
  events: EventItem[],
): Array<{
  key: string;
  dayNum: string;
  dayLabel: string;
  items: EventItem[];
}> {
  const groups = new Map<string, EventItem[]>();
  for (const event of events) {
    const { dayKey } = formatEventWhenParts(event.starts_at, new Date(), {
      timeUnknown: event.time_unknown,
    });
    const list = groups.get(dayKey) ?? [];
    list.push(event);
    groups.set(dayKey, list);
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

function eventClock(event: EventItem) {
  const when = formatEventWhenParts(event.starts_at, new Date(), {
    timeUnknown: event.time_unknown,
  });
  if (when.time === "—") {
    return { when, clock: "—", meridiem: "" };
  }
  const timeParts = when.time.replace(/\s+/g, " ").split(" ");
  return {
    when,
    clock: timeParts[0] ?? when.time,
    meridiem: timeParts[1] ?? "",
  };
}

/** Featured meta: "Tuesday 8/25 · Interlochen" */
function featuredMeta(event: EventItem): string {
  const d = new Date(event.starts_at);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Detroit",
    weekday: "long",
  }).format(d);
  const md = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Detroit",
    month: "numeric",
    day: "numeric",
  }).format(d);
  return `${weekday} ${md} · ${venueKicker(event.place)}`;
}

export default async function WhatsOnPage() {
  const snap = await getEventsSnapshot();
  const headers = await getSectionHeadersSnapshot();
  const featured = snap.featured;
  const byDay = groupByDay(snap.upcoming);
  const todayKey = detroitDayKey(new Date());

  return (
    <PublicShell active="/whats-on" header="compact">
      <div className="events-page">
        <SectionHero
          kicker="Night out"
          title="Events"
          header={headers.headers["whats-on"]}
          dek={
            <>
              Concerts, festivals, markets, library programs. Meetings live on
              Civic Calendar.{" "}
              <a
                href="#event-tip"
                className="font-semibold text-teal hover:underline"
              >
                Something missing?
              </a>
            </>
          }
        >
          <p className="events-dek events-dek-local section-photo-extra">
            For a night out:{" "}
            <a
              href={GOING_OUT[0].href}
              target="_blank"
              rel="noopener noreferrer"
              className="events-dek-link"
            >
              wine country
            </a>
            ,{" "}
            <a
              href={GOING_OUT[1].href}
              target="_blank"
              rel="noopener noreferrer"
              className="events-dek-link"
            >
              happy hours
            </a>
            ,{" "}
            <a
              href={GOING_OUT[2].href}
              target="_blank"
              rel="noopener noreferrer"
              className="events-dek-link"
            >
              Nauti-Cat
            </a>
            ,{" "}
            <a
              href={GOING_OUT[3].href}
              target="_blank"
              rel="noopener noreferrer"
              className="events-dek-link"
            >
              Discovery Cruises
            </a>
            . More on{" "}
            <Link href="/local" className="events-dek-link">
              Local
            </Link>
            .
          </p>
        </SectionHero>

        <section className="events-featured" aria-label="Featured nights out">
          <div className="events-featured-inner">
            {featured.map((event) => {
              const { clock, meridiem } = eventClock(event);
              return (
                <article key={event.id} className="events-featured-card">
                  <p className="events-featured-time">
                    {clock}
                    {meridiem ? (
                      <span className="events-featured-meridiem">
                        {" "}
                        {meridiem}
                      </span>
                    ) : null}
                  </p>
                  <p className="events-featured-meta">{featuredMeta(event)}</p>
                  <h2 className="events-featured-title">
                    {event.url ? (
                      <a
                        href={event.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {event.title} ↗
                      </a>
                    ) : (
                      event.title
                    )}
                  </h2>
                </article>
              );
            })}
            {featured.length === 0 ? (
              <p className="events-featured-empty">
                No timed nights-out in the next couple of weeks — we do not
                invent showtimes.
              </p>
            ) : null}
          </div>
        </section>

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
                {group.items.map((event) => {
                  const { clock, meridiem } = eventClock(event);
                  return (
                    <li key={event.id} className="events-row">
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
                        <p className="events-row-venue">
                          {venueKicker(event.place)}
                        </p>
                        <h3 className="events-row-title">
                          {event.url ? (
                            <a
                              href={event.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {event.title} ↗
                            </a>
                          ) : (
                            event.title
                          )}
                        </h3>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {byDay.length === 0 ? (
            <p className="events-empty">
              No community listings yet. Need Traverse News to pull Visit TC on
              the live computer if the calendar is empty — we do not invent
              events.
            </p>
          ) : null}
        </div>

        <EventTipsForm />
      </div>
    </PublicShell>
  );
}
