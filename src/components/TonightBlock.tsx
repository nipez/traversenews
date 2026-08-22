import Link from "next/link";
import { formatEventWhen } from "@/lib/dates";
import type { EventItem } from "@/lib/types";

export function TonightBlock({
  events,
  compact = false,
}: {
  events: EventItem[];
  compact?: boolean;
}) {
  return (
    <section className={`tonight-block anim-fade ${compact ? "" : ""}`}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-xl text-white md:text-[1.35rem]">
          Tonight & this weekend
        </h2>
        <Link
          href="/whats-on"
          className="text-xs font-semibold tracking-wide text-[#9fd0cd] uppercase"
        >
          All →
        </Link>
      </div>
      <ul>
        {events.map((event, i) => (
          <li
            key={event.id}
            className={i === 0 ? "pb-3" : "border-t border-white/15 py-3"}
          >
            <p className="text-[0.7rem] font-semibold tracking-[0.08em] text-teal uppercase">
              {event.place.toLowerCase().includes("through sunday")
                ? "Through Sunday"
                : formatEventWhen(event.starts_at)}
            </p>
            <p className="mt-1 font-serif text-[1.05rem] leading-snug text-white">
              {event.url ? (
                <a href={event.url} target="_blank" rel="noopener noreferrer">
                  {event.title}
                </a>
              ) : (
                event.title
              )}
            </p>
            <p className="mt-1 text-sm text-[#b5b5b5]">{event.place}</p>
          </li>
        ))}
        {events.length === 0 ? (
          <li className="text-sm text-[#b5b5b5]">No listings in the next few days.</li>
        ) : null}
      </ul>
    </section>
  );
}
