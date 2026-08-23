import Image from "next/image";
import { MorningScanSignup } from "@/components/MorningScanSignup";
import { PublicShell } from "@/components/PublicShell";
import { formatCivicDate, formatEventWhenParts } from "@/lib/dates";
import { getAppData } from "@/lib/data/store";
import { civicEvents } from "@/lib/queries";

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

export default async function CivicPage() {
  const data = await getAppData();
  const events = civicEvents(data.events, data.sources);

  return (
    <PublicShell active="/civic" header="compact">
      <div className="civic-page-head">
        <div>
          <p className="civic-kicker">Agenda</p>
          <h1 className="page-hed-civic">Civic Calendar</h1>
          <p className="civic-page-dek">
            City, county, and school board meetings. Concerts and markets are on
            Events.
          </p>
        </div>
        <Image
          src="/art/stamp-civic.png"
          alt=""
          width={130}
          height={130}
          className="section-stamp-lg shrink-0"
        />
      </div>

      <div className="civic-page-grid">
        <ul className="civic-agenda">
          {events.map((event) => {
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
                </div>
                <div className="civic-agenda-copy">
                  <p className="civic-agenda-title">{event.title}</p>
                  <p className="civic-agenda-place">{event.place}</p>
                </div>
                <p className="civic-agenda-time">{civicTime(event)}</p>
              </li>
            );
          })}
          {events.length === 0 ? (
            <li className="civic-empty">No upcoming meetings in the pull yet.</li>
          ) : null}
        </ul>

        <aside className="civic-page-rail">
          <div className="civic-rail-card">
            <h2 className="civic-rail-hed">Where this comes from</h2>
            <p className="civic-rail-copy">
              Meeting listings are pulled from city, county, and school board
              calendars. We do not invent agendas or invent times.
            </p>
          </div>
          <MorningScanSignup variant="teal" />
        </aside>
      </div>
    </PublicShell>
  );
}
