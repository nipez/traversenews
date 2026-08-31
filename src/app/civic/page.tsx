import { DeskRail } from "@/components/DeskRail";
import { OfficialCalendars } from "@/components/OfficialCalendars";
import { PublicShell } from "@/components/PublicShell";
import { SectionHero } from "@/components/SectionHero";
import { formatCivicDate, formatEventWhenParts } from "@/lib/dates";
import { getSite } from "@/lib/sites";
import {
  getCivicSnapshot,
  getSectionHeadersSnapshot,
} from "@/lib/public-snapshots";
import type { EventItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Civic Calendar",
};

function isCancelled(title: string) {
  return /\bcancell?ed\b/i.test(title);
}

function civicTime(event: { starts_at: string; time_unknown?: boolean }): string {
  const t = formatEventWhenParts(event.starts_at, new Date(), {
    timeUnknown: event.time_unknown,
  }).time;
  if (t === "—" || /^12:00\s*AM$/i.test(t.trim())) return "—";
  return t;
}

type CivicRow =
  | { kind: "month"; key: string; name: string }
  | { kind: "event"; event: EventItem };

function withMonthHeadings(events: EventItem[]): CivicRow[] {
  const rows: CivicRow[] = [];
  let lastMonth = "";
  for (const event of events) {
    const d = formatCivicDate(event.starts_at);
    if (d.monthKey !== lastMonth) {
      rows.push({ kind: "month", key: d.monthKey, name: d.monthName });
      lastMonth = d.monthKey;
    }
    rows.push({ kind: "event", event });
  }
  return rows;
}

export default async function CivicPage() {
  const snap = await getCivicSnapshot();
  const headers = await getSectionHeadersSnapshot();
  const events = snap.events;
  const rows = withMonthHeadings(events);

  return (
    <PublicShell active="/civic" header="compact">
      <SectionHero
        kicker="Agenda"
        title="Civic Calendar"
        header={headers.headers.civic}
        dek="City, county, and school board meetings. Concerts and markets are on Events."
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
            const cancelled = isCancelled(event.title);
            return (
              <li
                key={event.id}
                className={`civic-agenda-row ${cancelled ? "cancelled" : ""}`.trim()}
              >
                <div className="civic-datebox">
                  <div className="civic-datebox-dow">{d.day}</div>
                  <div className="civic-datebox-day">{d.label}</div>
                  <div className="civic-datebox-month">{d.monthAbbr}</div>
                </div>
                <div className="civic-agenda-copy">
                  <p className="civic-agenda-title">
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
                  <p className="civic-agenda-place">{event.place}</p>
                </div>
                <p className="civic-agenda-time">{civicTime(event)}</p>
              </li>
            );
          })}
          {events.length === 0 ? (
            <li className="civic-empty">No upcoming meetings yet.</li>
          ) : null}
        </ul>
        <OfficialCalendars links={getSite().civicHandoffs} />

        </div>
        <DeskRail
          active="/civic"
          outboundLinks={getSite().civicHandoffs}
          outboundKicker="Official calendars"
        />
      </div>
    </PublicShell>
  );
}
