import Image from "next/image";
import { EventTipsForm } from "@/components/EventTipsForm";
import { PublicShell } from "@/components/PublicShell";
import { detroitDayKey, formatEventWhenParts } from "@/lib/dates";
import { getAppData, listEvents } from "@/lib/data/store";
import {
  dedupeEvents,
  eventInUpcomingWindow,
  isCivicEvent,
  looksLikeLowValueListing,
  selectTonightEvents,
  venueKicker,
  isHsAthleticsEventSource,
} from "@/lib/events";
import type { EventItem } from "@/lib/types";
import { GOING_OUT } from "@/lib/useful-local";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Events",
};

const HORIZON_DAYS = 12;

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
        // Timed first, then date-only; both chronological.
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
  const data = await getAppData();
  const all = await listEvents();
  const now = new Date();

  // Peach band: next 3 TIMED nights-out only — never date-only Opera as noon.
  const featured = selectTonightEvents(all, data.sources, {
    now,
    limit: 3,
    horizonDays: HORIZON_DAYS,
    maxPerSource: 2,
    timedOnly: true,
  });

  const upcoming = dedupeEvents(all).filter(
    (e) =>
      !isHsAthleticsEventSource(e.source_id) &&
      eventInUpcomingWindow(e, now, {
        horizonMs: HORIZON_DAYS * 24 * 60 * 60 * 1000,
      }) &&
      !isCivicEvent(e, data.sources) &&
      !looksLikeLowValueListing(e.title),
  );
  const byDay = groupByDay(upcoming);
  const todayKey = detroitDayKey(now);

  return (
    <PublicShell active="/whats-on" header="compact">
      <div className="events-page">
        <header className="events-hero">
          <div className="events-hero-copy">
            <p className="events-kicker">Night out</p>
            <h1 className="events-hed">Events</h1>
            <p className="events-dek">
              Concerts, festivals, markets, library programs. Meetings live on
              Civic Calendar.{" "}
              <a href="#event-tip" className="font-semibold text-teal hover:underline">
                Something missing?
              </a>
            </p>
          </div>
          <Image
            src="/art/stamp-night.png"
            alt=""
            width={150}
            height={150}
            className="events-stamp"
          />
        </header>

        <p className="events-going-out">
          <span className="events-going-out-label">Going out</span>
          {GOING_OUT.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="events-going-out-link"
            >
              {link.label}
            </a>
          ))}
        </p>

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
