import Link from "next/link";
import { formatEventWhenParts } from "@/lib/dates";
import type { EventItem } from "@/lib/types";

export function TonightBlock({
  events,
  limit = 4,
  className = "",
}: {
  events: EventItem[];
  compact?: boolean;
  limit?: number;
  className?: string;
}) {
  const shown = events.slice(0, limit);

  return (
    <section className={`tonight-poster anim-fade ${className}`.trim()}>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-[0.7rem] font-bold tracking-[0.16em] text-teal uppercase">
            Night out
          </p>
          <h2 className="mt-1 font-serif text-[1.75rem] leading-none tracking-tight text-ink md:text-[2rem]">
            Tonight & this weekend
          </h2>
        </div>
        <Link
          href="/whats-on"
          className="text-[0.7rem] font-bold tracking-[0.14em] text-teal uppercase"
        >
          All →
        </Link>
      </div>

      <ul className="space-y-0">
        {shown.map((event, i) => {
          const when = formatEventWhenParts(event.starts_at);
          const timeParts = when.time.replace(/\s+/g, " ").split(" ");
          const clock = timeParts[0] ?? when.time;
          const meridiem = timeParts[1] ?? "";

          return (
            <li
              key={event.id}
              className={
                i === 0
                  ? "border-t border-ink/20 pt-5 pb-5"
                  : "border-t border-rule py-5"
              }
            >
              <div className="flex gap-4">
                <div className="w-[5.5rem] shrink-0 md:w-[6.25rem]">
                  <p className="tonight-time font-serif leading-none tracking-tight text-ink">
                    {clock}
                  </p>
                  <p className="mt-1 text-[0.65rem] font-bold tracking-[0.12em] text-teal uppercase">
                    {meridiem} · {when.dayLabel}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.82rem] leading-snug text-[#555]">
                    {event.place}
                  </p>
                  <p className="mt-1 font-serif text-[1.2rem] leading-snug tracking-tight text-ink md:text-[1.28rem]">
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
                  </p>
                </div>
              </div>
            </li>
          );
        })}
        {shown.length === 0 ? (
          <li className="border-t border-rule py-4 text-sm text-muted">
            No concerts or community listings in the next few days. Civic
            meetings stay on Civic.
          </li>
        ) : null}
      </ul>
    </section>
  );
}
