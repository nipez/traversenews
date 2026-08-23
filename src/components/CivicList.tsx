import Image from "next/image";
import Link from "next/link";
import { formatCivicDate } from "@/lib/dates";
import type { EventItem } from "@/lib/types";

export function CivicList({
  events,
  title = "Civic Calendar",
  linkLabel = "Full calendar",
  showStamp = false,
  className = "",
}: {
  events: EventItem[];
  title?: string;
  linkLabel?: string;
  showStamp?: boolean;
  className?: string;
}) {
  return (
    <section
      className={`civic-band ${showStamp ? "section-band" : ""} ${className}`.trim()}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {showStamp ? (
            <Image
              src="/art/stamp-civic.png"
              alt=""
              width={72}
              height={72}
              className="section-stamp shrink-0"
            />
          ) : null}
          <div className="min-w-0">
            {showStamp ? (
              <p className="text-[0.7rem] font-bold tracking-[0.16em] text-teal uppercase">
                Agenda
              </p>
            ) : null}
            <h2
              className={
                showStamp
                  ? "mt-1 font-serif text-[1.75rem] leading-none tracking-tight text-ink md:text-[2rem]"
                  : "font-serif text-lg tracking-tight text-ink"
              }
            >
              {title}
            </h2>
          </div>
        </div>
        <Link
          href="/civic"
          className="shrink-0 pt-1 text-[0.7rem] font-bold tracking-[0.14em] text-teal uppercase"
        >
          {linkLabel} →
        </Link>
      </div>
      <ul>
        {events.map((event) => {
          const d = formatCivicDate(event.starts_at);
          return (
            <li
              key={event.id}
              className="flex gap-3 border-t border-ink/15 py-3 first:border-t-0"
            >
              <div className="w-11 shrink-0 text-[0.68rem] font-bold tracking-wide text-muted uppercase">
                <div>{d.day}</div>
                <div>{d.label}</div>
              </div>
              <div>
                <p className="text-[0.95rem] font-medium leading-snug text-ink">
                  {event.title}
                </p>
                <p className="mt-0.5 text-xs text-muted">{event.place}</p>
              </div>
            </li>
          );
        })}
        {events.length === 0 ? (
          <li className="border-t border-ink/15 py-3 text-sm text-muted">
            No upcoming meetings in the pull yet.
          </li>
        ) : null}
      </ul>
    </section>
  );
}
