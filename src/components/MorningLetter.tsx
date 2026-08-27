import Link from "next/link";
import { formatCivicDate, formatEventWhenParts, emailDateLabel } from "@/lib/dates";
import type { EmailEditionSnapshot } from "@/lib/types";

function civicLabel(startsAt: string): string {
  const d = formatCivicDate(startsAt);
  const month =
    d.monthAbbr.charAt(0) + d.monthAbbr.slice(1).toLowerCase();
  const weekday = d.day.charAt(0) + d.day.slice(1).toLowerCase();
  return `${month} ${d.label} ${weekday}`;
}

function eventWhenLabel(
  startsAt: string,
  timeUnknown?: boolean,
): string {
  const parts = formatEventWhenParts(startsAt, new Date(), {
    timeUnknown,
  });
  // Weekday + clock (or — for date-only / midnight). Never invent noon.
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Detroit",
    weekday: "short",
  }).format(new Date(startsAt));
  return `${weekday} ${parts.time}`;
}

function sportsWhenLabel(
  startsAt: string,
  timeUnknown?: boolean,
): string {
  const parts = formatEventWhenParts(startsAt, new Date(), {
    timeUnknown,
  });
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Detroit",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(startsAt));
  return `${weekday} · ${parts.time}`;
}

/**
 * Cream morning letter body — live preview or frozen archive day.
 * Sending is never wired from here.
 */
export function MorningLetter({
  letter,
  mode,
}: {
  letter: EmailEditionSnapshot;
  mode: "preview" | "archive";
}) {
  const dateObj = (() => {
    const [y, m, d] = letter.date.split("-").map(Number);
    if (!y || !m || !d) return new Date(letter.captured_at);
    return new Date(Date.UTC(y, m - 1, d, 17, 0, 0));
  })();

  return (
    <div className="morning-letter border border-ink bg-paper p-5 md:p-8">
      <div className="morning-letter-head flex items-baseline justify-between gap-3 border-b-2 border-ink pb-3">
        <p className="wordmark wordmark-ink text-[1.4rem]">
          traverse<span className="wordmark-dot">.</span>news
        </p>
        <p className="morning-letter-date text-[0.65rem] font-extrabold tracking-[0.08em] text-muted uppercase">
          {emailDateLabel(dateObj)}
        </p>
      </div>

      <p className="mt-5 font-serif text-[1.05rem] leading-relaxed text-muted-2">
        {letter.lead
          ? "Good morning. Start with our reporting, then the rest of the town and what's on tonight."
          : "Good morning. Here's the rest of the town from other desks, then what's on tonight."}
      </p>

      {letter.lead ? (
        <div className="mt-6 border border-ink bg-peach p-4">
          <div className="lead-kicker-row">
            <span className="lead-sq" aria-hidden />
            <p className="lead-kicker">The one to read</p>
          </div>
          <h2 className="mt-2 font-display text-2xl leading-snug font-black tracking-tight">
            <a href={letter.lead.url}>{letter.lead.title}</a>
          </h2>
          {letter.lead.dek ? (
            <p className="mt-2 font-serif text-sm text-muted-2">
              {letter.lead.dek}
            </p>
          ) : null}
          <div className="mt-3">
            <span className="source-box">traverse.news</span>
          </div>
        </div>
      ) : null}

      <p className="mt-8 text-[0.65rem] font-extrabold tracking-[0.1em] text-muted uppercase">
        The rest of the town
      </p>
      <ul className="mt-2">
        {letter.around.map((item) => (
          <li key={`${item.url}|${item.title}`} className="border-t border-rule py-4">
            <h3 className="font-serif text-lg leading-snug font-semibold">
              <a href={item.url}>{item.title}</a>
            </h3>
            {item.dek ? (
              <p className="mt-1 text-sm text-muted-2">{item.dek}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold text-teal">
                {item.sources.join(" · ")}
              </p>
              {item.paywalled ? (
                <span className="paywall-pill">Paywall</span>
              ) : null}
            </div>
          </li>
        ))}
        {letter.around.length === 0 ? (
          <li className="border-t border-rule py-4 text-sm text-muted">
            No wire yet — we do not invent stories.
          </li>
        ) : null}
      </ul>

      {letter.alerts.length > 0 ? (
        <div className="mt-6 border border-ink bg-paper-2 p-4">
          <p className="text-[0.65rem] font-extrabold tracking-[0.1em] text-ink uppercase">
            Alerts
          </p>
          <ul className="mt-2 space-y-3 text-sm">
            {letter.alerts.map((a) => (
              <li key={a.url}>
                <span className="source-box">{a.source_name}</span>
                <p className="mt-1 font-semibold">
                  <a href={a.url} target="_blank" rel="noopener noreferrer">
                    {a.title}
                  </a>
                </p>
                {a.dek ? (
                  <p className="mt-0.5 text-muted-2">{a.dek}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6 border border-ink bg-peach p-4">
        <p className="text-[0.65rem] font-extrabold tracking-[0.1em] text-ink uppercase">
          Tonight
        </p>
        <ul className="mt-2 space-y-2 text-sm">
          {letter.tonight.map((e) => (
            <li key={`${e.starts_at}|${e.title}`}>
              <strong className="font-display">
                {eventWhenLabel(e.starts_at, e.time_unknown)}
              </strong>
              {" — "}
              {e.url ? (
                <a href={e.url} target="_blank" rel="noopener noreferrer">
                  {e.title}
                </a>
              ) : (
                e.title
              )}
              . {e.place}
            </li>
          ))}
          {letter.tonight.length === 0 ? (
            <li className="text-muted">No night-out listings yet.</li>
          ) : null}
        </ul>
      </div>

      <div className="mt-6">
        <p className="text-[0.65rem] font-extrabold tracking-[0.1em] text-teal uppercase">
          Civic this week
        </p>
        <ul className="mt-2 space-y-2 text-sm">
          {letter.civic.map((e) => (
            <li key={`${e.starts_at}|${e.title}`}>
              <strong>{civicLabel(e.starts_at)}</strong>
              {" — "}
              <span className="text-teal">{e.title}</span>. {e.place}
            </li>
          ))}
          {letter.civic.length === 0 ? (
            <li className="text-muted">No meetings in the pull yet.</li>
          ) : null}
        </ul>
      </div>

      {letter.sports.length > 0 ? (
        <div className="mt-6 border border-ink bg-paper p-4">
          <p className="text-[0.65rem] font-extrabold tracking-[0.1em] text-ink uppercase">
            Sports this week
          </p>
          <ul className="mt-2 space-y-2 text-sm">
            {letter.sports.map((g) => (
              <li key={`${g.starts_at}|${g.title}|${g.school}`}>
                <strong className="font-display">
                  {sportsWhenLabel(g.starts_at, g.time_unknown)}
                </strong>
                {" · "}
                <span className="font-bold text-teal">{g.school}</span>
                {" — "}
                {g.url ? (
                  <a href={g.url} target="_blank" rel="noopener noreferrer">
                    {g.title}
                  </a>
                ) : (
                  g.title
                )}
                {g.place ? `. ${g.place}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-8 border-t-2 border-ink pt-4 text-sm text-muted">
        <p>
          Send us a tip:{" "}
          <Link href="/tips" className="font-bold text-teal">
            traverse.news/tips
          </Link>
        </p>
        <p className="mt-2 text-xs">
          Traverse City, Michigan ·{" "}
          <Link href="/email/unsubscribe" className="font-bold text-teal">
            Unsubscribe
          </Link>{" "}
          · Weekdays and Saturdays
          {mode === "archive" ? " · Archive copy (not sent)" : null}
        </p>
        {mode === "preview" ? (
          <p className="mt-3 text-xs">
            <Link href="/email/archive" className="font-bold text-teal">
              Past mornings →
            </Link>
          </p>
        ) : (
          <p className="mt-3 text-xs">
            <Link href="/email" className="font-bold text-teal">
              Live preview →
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
