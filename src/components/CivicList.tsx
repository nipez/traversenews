import Image from "next/image";
import Link from "next/link";
import { formatCivicDate } from "@/lib/dates";
import type { EventItem } from "@/lib/types";

function isCancelled(title: string) {
  return /\bcancell?ed\b/i.test(title);
}

export function CivicList({
  events,
  title = "Civic Calendar",
  linkLabel = "Full calendar",
  showStamp = false,
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
      <div className="civic-head">
        <div>
          <p className="civic-kicker">Next meetings</p>
          <h2 className="civic-hed">{title}</h2>
        </div>
        {showStamp ? (
          <Image
            src="/art/stamp-civic.png"
            alt=""
            width={70}
            height={70}
            className="section-stamp"
          />
        ) : null}
      </div>

      <ul className="civic-list">
        {shown.map((event) => {
          const d = formatCivicDate(event.starts_at);
          const cancelled = isCancelled(event.title);
          return (
            <li
              key={event.id}
              className={`civic-row ${cancelled ? "cancelled" : ""}`.trim()}
            >
              <div className="civic-datebox">
                <div className="civic-datebox-dow">{d.day}</div>
                <div className="civic-datebox-day">{d.label}</div>
              </div>
              <div className="civic-copy">
                <p className="civic-title">{event.title}</p>
                <p className="civic-place">{event.place}</p>
              </div>
            </li>
          );
        })}
        {shown.length === 0 ? (
          <li className="civic-empty">No upcoming meetings in the pull yet.</li>
        ) : null}
      </ul>

      <Link href="/civic" className="civic-more">
        {linkLabel} →
      </Link>
    </section>
  );
}
