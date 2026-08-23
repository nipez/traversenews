import { PublicShell } from "@/components/PublicShell";
import { TonightBlock } from "@/components/TonightBlock";
import { formatEventWhenParts } from "@/lib/dates";
import { getAppData, listEvents } from "@/lib/data/store";
import { dedupeEvents, isCivicEvent, looksLikeLowValueListing, selectTonightEvents } from "@/lib/events";
import type { EventItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "What's on",
};

function groupByDay(events: EventItem[]): Array<{ key: string; label: string; items: EventItem[] }> {
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
    limit: 8,
    horizonDays: 7,
    maxPerSource: 3,
  });

  // Night-out only — civic meetings stay on /civic.
  const upcoming = dedupeEvents(all).filter(
    (e) =>
      new Date(e.starts_at).getTime() >= Date.now() - 60 * 60 * 1000 &&
      !isCivicEvent(e, data.sources) &&
      !looksLikeLowValueListing(e.title),
  );
  const byDay = groupByDay(upcoming);

  return (
    <PublicShell active="/whats-on">
      <div className="mx-auto max-w-3xl">
        <p className="text-[0.72rem] font-bold tracking-[0.14em] text-teal uppercase">
          Night out
        </p>
        <h1 className="mt-2 font-serif text-[2.35rem] leading-none tracking-tight text-ink md:text-[2.75rem]">
          What&apos;s on
        </h1>
        <p className="mt-3 max-w-xl text-[1.02rem] text-[#3a3a3a]">
          Concerts, festivals, markets, library programs, and things to do.
          School board and commission meetings live on Civic.
        </p>

        <div className="mt-8">
          <TonightBlock events={featured} />
        </div>

        <div className="mt-12 space-y-10">
          {byDay.map((group) => (
            <section key={group.key}>
              <h2 className="border-b-2 border-ink pb-2 font-serif text-2xl tracking-tight text-ink">
                {group.label}
              </h2>
              <ul>
                {group.items.map((event) => {
                  const when = formatEventWhenParts(event.starts_at);
                  return (
                    <li key={event.id} className="border-t border-rule py-5 first:border-t-0">
                      <p className="text-[0.95rem] font-bold tracking-[0.04em] text-teal uppercase">
                        <span className="text-[1.2rem] tracking-tight">{when.time}</span>
                      </p>
                      <p className="mt-1 text-sm text-muted">{event.place}</p>
                      <h3 className="mt-1.5 font-serif text-[1.35rem] leading-snug tracking-tight">
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
      </div>
    </PublicShell>
  );
}
