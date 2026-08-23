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
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-[1.45rem] leading-none tracking-tight text-white md:text-[1.55rem]">
          Tonight & this weekend
        </h2>
        <Link
          href="/whats-on"
          className="text-[0.68rem] font-bold tracking-[0.12em] text-[#9fd0cd] uppercase"
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
              className={i === 0 ? "pb-4" : "border-t border-white/20 py-4"}
            >
              <p className="font-sans text-[0.95rem] font-bold tracking-[0.04em] text-teal uppercase">
                <span className="text-[1.15rem] tracking-tight text-[#b8ebe7]">
                  {when.time}
                </span>
                <span className="mx-2 text-white/35">·</span>
                <span>{when.dayLabel}</span>
              </p>
              <p className="mt-1.5 text-[0.92rem] leading-snug text-[#c8c8c8]">
                {event.place}
              </p>
              <p className="mt-1.5 font-serif text-[1.2rem] leading-snug text-white md:text-[1.28rem]">
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
          <li className="text-sm text-[#b5b5b5]">
            No concerts or community listings in the next few days. Civic
            meetings stay on Civic.
          </li>
        ) : null}
      </ul>
    </section>
  );
}
