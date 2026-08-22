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
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-xl text-ink">{title}</h2>
        <Link href="/civic" className="text-xs font-semibold tracking-wide text-muted uppercase">
          {linkLabel}
        </Link>
      </div>
      <ul>
        {events.map((event) => {
          const d = formatCivicDate(event.starts_at);
          return (
            <li key={event.id} className="flex gap-3 border-t border-rule py-3 first:border-t-0">
              <div className="w-12 shrink-0 text-[0.75rem] font-bold tracking-wide text-ink uppercase">
                <div>{d.day}</div>
                <div>{d.label}</div>
              </div>
              <div>
                <p className="font-medium leading-snug text-ink">{event.title}</p>
                <p className="mt-0.5 text-sm text-muted">{event.place}</p>
              </div>
            </li>
          );
        })}
        {events.length === 0 ? (
          <li className="text-sm text-muted">No upcoming meetings seeded yet.</li>
        ) : null}
      </ul>
    </section>
  );
}
