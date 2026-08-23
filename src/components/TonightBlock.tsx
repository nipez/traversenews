import Link from "next/link";
import { formatEventWhenParts } from "@/lib/dates";
import type { EventItem } from "@/lib/types";

export function TonightBlock({
  events,
}: {
  events: EventItem[];
  compact?: boolean;
}) {
  return (
    <section className="tonight-block anim-fade">
      <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-rule pb-3">
        <div>
          <p className="kicker">Night out</p>
          <h2 className="mt-1.5 font-serif text-[1.45rem] leading-none tracking-tight text-ink md:text-[1.6rem]">
            Tonight & this weekend
          </h2>
        </div>
        <Link
          href="/whats-on"
          className="text-[0.68rem] font-bold tracking-[0.12em] text-teal uppercase"
        >
          All →
        </Link>
      </div>
      <ul>
        {events.map((event, i) => {
          const when = formatEventWhenParts(event.starts_at);
          return (
            <li
              key={event.id}
              className={
                i === 0
                  ? "pb-4 pl-3"
                  : "border-t border-rule py-4 pl-3"
              }
            >
              <p className="font-sans text-[0.8rem] font-bold tracking-[0.08em] text-teal uppercase">
                <span className="text-[1.05rem] tracking-tight">{when.time}</span>
                <span className="mx-2 text-rule">·</span>
                <span>{when.dayLabel}</span>
              </p>
              <p className="mt-1.5 text-[0.95rem] leading-snug text-[#444]">
                {event.place}
              </p>
              <p className="mt-1.5 font-serif text-[1.2rem] leading-snug tracking-tight text-ink md:text-[1.28rem]">
                {event.url ? (
                  <a href={event.url} target="_blank" rel="noopener noreferrer">
                    {event.title}
                  </a>
                ) : (
                  event.title
                )}
              </p>
            </li>
          );
        })}
        {events.length === 0 ? (
          <li className="py-3 text-sm text-muted">
            No concerts or community listings in the next few days. Civic
            meetings stay on Civic.
          </li>
        ) : null}
      </ul>
    </section>
  );
}
