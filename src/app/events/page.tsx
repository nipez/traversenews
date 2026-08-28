import { DeskRail } from "@/components/DeskRail";
import { EventTipsForm } from "@/components/EventTipsForm";
import { PublicShell } from "@/components/PublicShell";
import { SectionHero } from "@/components/SectionHero";
import { formatCivicDate, formatEventWhenParts } from "@/lib/dates";
import { venueKicker } from "@/lib/events";
import {
  getEventsSnapshot,
  getSectionHeadersSnapshot,
} from "@/lib/public-snapshots";
import type { EventItem } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Events",
};

function eventTime(event: EventItem): string {
  const t = formatEventWhenParts(event.starts_at, new Date(), {
    timeUnknown: event.time_unknown,
  }).time;
  if (t === "—" || /^12:00\s*AM$/i.test(t.trim())) return "—";
  return t;
}

type AgendaRow =
  | { kind: "month"; key: string; name: string }
  | { kind: "event"; event: EventItem };

function withMonthHeadings(events: EventItem[]): AgendaRow[] {
  const sorted = [...events].sort((a, b) => {
    if (Boolean(a.time_unknown) !== Boolean(b.time_unknown)) {
      return a.time_unknown ? 1 : -1;
    }
    return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
  });
  const rows: AgendaRow[] = [];
  let lastMonth = "";
  for (const event of sorted) {
    const d = formatCivicDate(event.starts_at);
    if (d.monthKey !== lastMonth) {
      rows.push({ kind: "month", key: d.monthKey, name: d.monthName });
      lastMonth = d.monthKey;
    }
    rows.push({ kind: "event", event });
  }
  return rows;
}

export default async function EventsPage() {
  const snap = await getEventsSnapshot();
  const headers = await getSectionHeadersSnapshot();
  const rows = withMonthHeadings(snap.upcoming);

  return (
    <PublicShell active="/events" header="compact">
      <SectionHero
        kicker="Local happenings"
        title="Events"
        header={headers.headers["whats-on"]}
        dek={
          <>
            Concerts, festivals, markets, library programs. Meetings live on{" "}
            <Link href="/civic" className="events-dek-link">
              Civic
            </Link>
            . Something missing?{" "}
            <a href="#event-tip" className="events-dek-link">
              Let us know
            </a>
          </>
        }
      />
      <div className="about-layout civic-layout">
        <div className="about-essay civic-main">
          <ul className="civic-agenda">
            {rows.map((row) => {
              if (row.kind === "month") {
                return (
                  <li key={`month-${row.key}`} className="civic-month-hed">
                    {row.name}
                  </li>
                );
              }
              const event = row.event;
              const d = formatCivicDate(event.starts_at);
              const title = event.url ? (
                <a
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {event.title}
                </a>
              ) : (
                event.title
              );
              return (
                <li key={event.id} className="civic-agenda-row">
                  <div className="civic-datebox">
                    <div className="civic-datebox-dow">{d.day}</div>
                    <div className="civic-datebox-day">{d.label}</div>
                    <div className="civic-datebox-month">{d.monthAbbr}</div>
                  </div>
                  <div className="civic-agenda-copy">
                    <p className="civic-agenda-title">{title}</p>
                    <p className="civic-agenda-place">
                      {venueKicker(event.place)}
                    </p>
                  </div>
                  <p className="civic-agenda-time">{eventTime(event)}</p>
                </li>
              );
            })}
            {snap.upcoming.length === 0 ? (
              <li className="civic-empty">No community listings yet.</li>
            ) : null}
          </ul>

          <EventTipsForm />
        </div>
        <DeskRail active="/events" />
      </div>
    </PublicShell>
  );
}
