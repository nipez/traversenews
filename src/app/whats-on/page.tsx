import { PublicShell } from "@/components/PublicShell";
import { TonightBlock } from "@/components/TonightBlock";
import { formatEventWhenParts } from "@/lib/dates";
import { getAppData, listEvents } from "@/lib/data/store";
import {
  dedupeEvents,
  isCivicEvent,
  looksLikeLowValueListing,
  selectTonightEvents,
} from "@/lib/events";
import type { EventItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "What's on",
};

function groupByDay(
  events: EventItem[],
): Array<{ key: string; label: string; items: EventItem[] }> {
  const groups = new Map<string, EventItem[]>();
  for (const event of events) {
    const { dayKey } = formatEventWhenParts(event.starts_at);
    const list = groups.get(dayKey) ?? [];
    list.push(event);
    groups.set(dayKey, list);
  }
  return [...groups.entries()].map(([key, items]) => {
    const label = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Detroit",
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(new Date(items[0].starts_at));
    return { key, label, items };
  });
}

export default async function WhatsOnPage() {
  const data = await getAppData();
  const all = await listEvents();
  const featured = selectTonightEvents(all, data.sources, {
    limit: 6,
    horizonDays: 7,
    maxPerSource: 3,
  });

  const upcoming = dedupeEvents(all).filter(
    (e) =>
      new Date(e.starts_at).getTime() >= Date.now() - 60 * 60 * 1000 &&
      !isCivicEvent(e, data.sources) &&
      !looksLikeLowValueListing(e.title),
  );
  const byDay = groupByDay(upcoming);

  return (
    <PublicShell active="/whats-on" wide>
      <p className="text-[0.72rem] font-bold tracking-[0.16em] text-teal uppercase">
        Night out
      </p>
      <h1 className="mt-2 font-serif text-[2.75rem] leading-[0.95] tracking-tight text-ink md:text-[3.5rem]">
        What&apos;s on
      </h1>
      <p className="mt-4 max-w-xl text-[1.05rem] text-[#3a3a3a]">
        Concerts, festivals, markets, library programs. Meetings live on Civic.
      </p>

      <div className="mt-10 max-w-2xl">
        <TonightBlock events={featured} limit={6} />
      </div>

      <div className="mt-16 max-w-3xl space-y-12">
        {byDay.map((group) => (
          <section key={group.key}>
            <h2 className="border-b-2 border-ink pb-3 font-serif text-[1.85rem] leading-none tracking-tight text-ink md:text-[2.2rem]">
              {group.label}
            </h2>
            <ul>
              {group.items.map((event) => {
                const when = formatEventWhenParts(event.starts_at);
                const timeParts = when.time.replace(/\s+/g, " ").split(" ");
                return (
                  <li
                    key={event.id}
                    className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 border-t border-rule py-5 first:border-t-0 md:grid-cols-[6.5rem_minmax(0,1fr)]"
                  >
                    <div>
                      <p className="font-serif text-[1.55rem] leading-none tracking-tight text-ink md:text-[1.75rem]">
                        {timeParts[0]}
                      </p>
                      <p className="mt-1 text-[0.65rem] font-bold tracking-[0.1em] text-teal uppercase">
                        {timeParts[1] ?? ""}
                      </p>
                    </div>
                    <div>
                      <p className="text-[0.88rem] text-[#555]">{event.place}</p>
                      <h3 className="mt-1 font-serif text-[1.35rem] leading-snug tracking-tight md:text-[1.45rem]">
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
