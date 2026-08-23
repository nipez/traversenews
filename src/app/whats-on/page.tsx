import Image from "next/image";
import { PublicShell } from "@/components/PublicShell";
import { formatEventWhenParts } from "@/lib/dates";
import { getAppData, listEvents } from "@/lib/data/store";
import {
  dedupeEvents,
  eventInUpcomingWindow,
  isCivicEvent,
  looksLikeLowValueListing,
  selectTonightEvents,
} from "@/lib/events";
import type { EventItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Events",
};

function groupByDay(
  events: EventItem[],
): Array<{
  key: string;
  weekday: string;
  dayNum: string;
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
  return [...groups.entries()].map(([key, items]) => {
    const d = new Date(items[0].starts_at);
    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Detroit",
      weekday: "long",
    }).format(d);
    const dayNum = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Detroit",
      day: "numeric",
    }).format(d);
    return { key, weekday, dayNum, items };
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

export default async function WhatsOnPage() {
  const data = await getAppData();
  const all = await listEvents();
  const featured = selectTonightEvents(all, data.sources, {
    limit: 3,
    horizonDays: 10,
    maxPerSource: 2,
  });

  const upcoming = dedupeEvents(all).filter(
    (e) =>
      eventInUpcomingWindow(e, new Date()) &&
      !isCivicEvent(e, data.sources) &&
      !looksLikeLowValueListing(e.title),
  );
  const byDay = groupByDay(upcoming);

  return (
    <PublicShell active="/whats-on" header="compact">
      <div className="events-hero-row">
        <div>
          <p className="text-[0.68rem] font-extrabold tracking-[0.16em] text-teal uppercase">
            Night out
          </p>
          <h1 className="events-hed mt-2">Events</h1>
          <p className="mt-3 max-w-md font-serif text-[1.05rem] text-muted-2">
            Concerts, festivals, markets, library programs. Meetings live on
            Civic Calendar.
          </p>
        </div>
        <Image
          src="/art/stamp-night.png"
          alt=""
          width={150}
          height={150}
          className="section-stamp-lg hidden shrink-0 sm:block"
        />
      </div>

      <div className="events-featured mt-8">
        <div className="events-featured-inner">
          {featured.map((event) => {
            const { when, clock, meridiem } = eventClock(event);
            return (
              <article key={event.id} className="min-w-0">
                <p className="font-display text-[1.85rem] leading-none font-black tracking-tight text-ink md:text-[2.1rem]">
                  {clock}
                  {meridiem ? (
                    <span className="ml-1 text-[0.7rem] font-extrabold tracking-[0.08em] text-muted-2 uppercase">
                      {meridiem}
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-[0.65rem] font-extrabold tracking-[0.12em] text-muted-2 uppercase">
                  {when.dayLabel}
                </p>
                <p className="mt-3 text-[0.8rem] text-muted-2">{event.place}</p>
                <h2 className="mt-1 font-serif text-[1.2rem] leading-snug font-semibold text-ink md:text-[1.3rem]">
                  {event.url ? (
                    <a
                      href={event.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-teal"
                    >
                      {event.title}
                    </a>
                  ) : (
                    event.title
                  )}
                </h2>
              </article>
            );
          })}
          {featured.length === 0 ? (
            <p className="text-sm text-muted-2 col-span-full">
              No featured night-out listings yet — we do not invent events.
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-12 max-w-3xl space-y-12">
        {byDay.map((group) => (
          <section key={group.key}>
            <div className="mb-4 flex items-end gap-3 border-b-2 border-ink pb-3">
              <p className="day-num">{group.dayNum}</p>
              <p className="pb-1 text-[0.85rem] font-extrabold tracking-[0.08em] text-muted-2 uppercase">
                {group.weekday}
              </p>
            </div>
            <ul className="grid gap-0 sm:grid-cols-2">
              {group.items.map((event) => {
                const { clock, meridiem } = eventClock(event);
                return (
                  <li
                    key={event.id}
                    className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 border-t border-rule py-4 first:border-t-0 sm:border-t"
                  >
                    <div>
                      <p className="font-display text-[1.35rem] leading-none font-black tracking-tight text-ink">
                        {clock}
                      </p>
                      {meridiem ? (
                        <p className="mt-1 text-[0.6rem] font-extrabold tracking-[0.1em] text-teal uppercase">
                          {meridiem}
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <p className="text-[0.8rem] text-muted">{event.place}</p>
                      <h3 className="mt-1 font-serif text-[1.15rem] leading-snug font-semibold">
                        {event.url ? (
                          <a
                            href={event.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-teal"
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
          <p className="text-sm text-muted">
            No community listings yet. Need Traverse News to pull Visit TC on
            the live computer if the calendar is empty — we do not invent
            events.
          </p>
        ) : null}
      </div>
    </PublicShell>
  );
}
