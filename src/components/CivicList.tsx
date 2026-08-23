import Link from "next/link";
import { formatCivicDate } from "@/lib/dates";
import type { EventItem } from "@/lib/types";

export function CivicList({
  events,
  title = "Civic",
  linkLabel = "Next 10 days",
}: {
  events: EventItem[];
  title?: string;
  linkLabel?: string;
}) {
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-3 py-2">
        <h2 className="font-serif text-lg tracking-tight text-ink">{title}</h2>
        <Link
          href="/civic"
          className="text-[0.65rem] font-semibold tracking-[0.1em] text-muted uppercase"
        >
          {linkLabel}
        </Link>
      </div>
      <ul>
        {events.map((event) => {
          const d = formatCivicDate(event.starts_at);
          return (
            <li
              key={event.id}
              className="flex gap-3 border-t border-rule py-2.5 first:border-t-0"
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
          <li className="py-3 text-sm text-muted">
            No upcoming meetings in the pull yet.
          </li>
        ) : null}
      </ul>
    </section>
  );
}
