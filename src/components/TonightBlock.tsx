import Image from "next/image";
import Link from "next/link";
import { formatEventWhenParts } from "@/lib/dates";
import { getSite } from "@/lib/sites";
import type { EventItem } from "@/lib/types";

export function TonightBlock({
  events,
  limit = 4,
  className = "",
  showStamp = true,
}: {
  events: EventItem[];
  compact?: boolean;
  limit?: number;
  className?: string;
  showStamp?: boolean;
  variant?: "well" | "plain";
}) {
  const shown = events.slice(0, limit);

  return (
    <section className={`tonight-well ${className}`.trim()}>
      <div className="tonight-head">
        <div>
          <p className="tonight-kicker">Local happenings</p>
          <h2 className="tonight-hed">Coming up</h2>
          <p className="tonight-dek">{getSite().pageCopy.comingUpDek}</p>
        </div>
        {showStamp ? (
          <Image
            src="/art/stamp-night.png"
            alt=""
            width={70}
            height={70}
            className="section-stamp"
          />
        ) : null}
      </div>

      <ul className="tonight-list">
        {shown.map((event) => {
          const when = formatEventWhenParts(event.starts_at, new Date(), {
            timeUnknown: event.time_unknown,
          });
          const hideClock = when.time === "—";
          const timeParts = hideClock
            ? []
            : when.time.replace(/\s+/g, " ").split(" ");
          const clock = hideClock ? "—" : (timeParts[0] ?? when.time);
          const meridiem = hideClock ? "" : (timeParts[1] ?? "");

          return (
            <li key={event.id} className="tonight-row">
              <div className="tonight-when">
                <p className="tonight-time">
                  {clock}
                  {meridiem ? (
                    <span className="tonight-meridiem"> {meridiem}</span>
                  ) : null}
                </p>
                <p className="tonight-day">{when.dayLabel}</p>
              </div>
              <div className="tonight-copy">
                <p className="tonight-venue">{event.place}</p>
                <p className="tonight-title">
                  {event.url ? (
                    <a
                      href={event.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {event.title}
                    </a>
                  ) : (
                    event.title
                  )}
                </p>
              </div>
            </li>
          );
        })}
        {shown.length === 0 ? (
          <li className="tonight-empty">
            No concerts or community listings in the next few days.
          </li>
        ) : null}
      </ul>

      <Link href="/events" className="tonight-more">
        All Events →
      </Link>
    </section>
  );
}
