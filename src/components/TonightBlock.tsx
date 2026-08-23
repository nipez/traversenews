import Image from "next/image";
import Link from "next/link";
import { formatEventWhenParts } from "@/lib/dates";
import type { EventItem } from "@/lib/types";

export function TonightBlock({
  events,
  limit = 4,
  className = "",
  showStamp = true,
  variant = "well",
}: {
  events: EventItem[];
  compact?: boolean;
  limit?: number;
  className?: string;
  showStamp?: boolean;
  variant?: "well" | "plain";
}) {
  const shown = events.slice(0, limit);
  const wrap =
    variant === "well"
      ? `tonight-well ${className}`.trim()
      : className;

  return (
    <section className={wrap}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {showStamp ? (
            <Image
              src="/art/stamp-night.png"
              alt=""
              width={70}
              height={70}
              className="section-stamp shrink-0"
            />
          ) : null}
          <div className="min-w-0 pt-0.5">
            <p className="text-[0.65rem] font-extrabold tracking-[0.16em] text-ink uppercase">
              Night out
            </p>
            <h2 className="mt-1 font-display text-[1.45rem] leading-none font-black tracking-tight text-ink md:text-[1.65rem]">
              Tonight
            </h2>
          </div>
        </div>
        <Link
          href="/whats-on"
          className="shrink-0 pt-1 text-[0.65rem] font-extrabold tracking-[0.12em] text-ink uppercase hover:text-teal"
        >
          Events →
        </Link>
      </div>

      <ul>
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
                  ? "border-t border-ink pt-4 pb-4"
                  : "border-t border-ink/40 py-4"
              }
            >
              <div className="flex gap-3">
                <div className="w-[5.25rem] shrink-0 md:w-[5.75rem]">
                  <p className="tonight-time">{clock}</p>
                  <p className="mt-1 text-[0.6rem] font-extrabold tracking-[0.1em] text-muted-2 uppercase">
                    {meridiem} · {when.dayLabel}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.78rem] leading-snug text-muted-2">
                    {event.place}
                  </p>
                  <p className="mt-1 font-serif text-[1.05rem] leading-snug font-semibold tracking-tight text-ink md:text-[1.12rem]">
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
          <li className="border-t border-ink py-4 text-sm text-muted-2">
            No concerts or community listings in the next few days.
          </li>
        ) : null}
      </ul>
    </section>
  );
}
