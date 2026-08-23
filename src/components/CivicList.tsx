import Image from "next/image";
import Link from "next/link";
import { formatCivicDate, formatEventWhenParts } from "@/lib/dates";
import type { EventItem } from "@/lib/types";

function isCancelled(title: string) {
  return /\bcancell?ed\b/i.test(title);
}

function civicTime(iso: string): string {
  const t = formatEventWhenParts(iso).time;
  // All-day / midnight placeholders often show as 12:00 AM — treat as unknown
  if (/^12:00\s*AM$/i.test(t.trim())) return "—";
  return t;
}

export function CivicList({
  events,
  title = "Civic Calendar",
  linkLabel = "Full calendar",
  showStamp = false,
  showTime = false,
  className = "",
  limit,
}: {
  events: EventItem[];
  title?: string;
  linkLabel?: string;
  showStamp?: boolean;
  showTime?: boolean;
  className?: string;
  limit?: number;
}) {
  const shown = typeof limit === "number" ? events.slice(0, limit) : events;

  return (
    <section className={`civic-card ${className}`.trim()}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {showStamp ? (
            <Image
              src="/art/stamp-civic.png"
              alt=""
              width={70}
              height={70}
              className="section-stamp shrink-0"
            />
          ) : null}
          <div className="min-w-0 pt-0.5">
            {showStamp ? (
              <p className="text-[0.65rem] font-extrabold tracking-[0.16em] text-ink uppercase">
                Agenda
              </p>
            ) : null}
            <h2 className="mt-1 font-display text-[1.35rem] leading-none font-black tracking-tight text-ink md:text-[1.5rem]">
              {title}
            </h2>
          </div>
        </div>
        <Link
          href="/civic"
          className="shrink-0 pt-1 text-[0.65rem] font-extrabold tracking-[0.12em] text-ink uppercase hover:text-teal"
        >
          {linkLabel} →
        </Link>
      </div>
      <ul>
        {shown.map((event) => {
          const d = formatCivicDate(event.starts_at);
          const cancelled = isCancelled(event.title);
          return (
            <li
              key={event.id}
              className={`flex gap-3 border-t border-ink/35 py-3 first:border-t-0 ${
                cancelled ? "cancelled" : ""
              }`}
            >
              <div className="civic-datebox">
                <div className="civic-datebox-dow">{d.day}</div>
                <div className="civic-datebox-day">{d.label}</div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[0.95rem] leading-snug font-semibold text-ink">
                  {event.title}
                </p>
                <p className="mt-0.5 text-xs text-muted">{event.place}</p>
                {showTime ? (
                  <p className="mt-1 text-xs font-bold tracking-wide text-muted-2 uppercase">
                    {civicTime(event.starts_at)}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
        {shown.length === 0 ? (
          <li className="border-t border-ink/35 py-3 text-sm text-muted">
            No upcoming meetings in the pull yet.
          </li>
        ) : null}
      </ul>
    </section>
  );
}
