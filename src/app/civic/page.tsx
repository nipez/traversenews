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

function civicTime(iso: string): string {
  const t = formatEventWhenParts(iso).time;
  if (/^12:00\s*AM$/i.test(t.trim())) return "—";
  return t;
}

export default async function CivicPage() {
  const data = await getAppData();
  const events = civicEvents(data.events, data.sources);

  return (
    <PublicShell active="/civic" header="compact">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.68rem] font-extrabold tracking-[0.16em] text-muted uppercase">
            Agenda
          </p>
          <h1 className="page-hed-civic mt-2">Civic Calendar</h1>
          <p className="mt-3 max-w-lg font-serif text-[1.05rem] text-muted-2">
            City, county, and school board meetings. Concerts and markets are on
            Events.
          </p>
        </div>
        <Image
          src="/art/stamp-civic.png"
          alt=""
          width={110}
          height={110}
          className="section-stamp shrink-0 sm:w-[130px] sm:h-[130px]"
        />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <ul className="border-t-2 border-ink">
          {events.map((event) => {
            const d = formatCivicDate(event.starts_at);
            const cancelled = isCancelled(event.title);
            return (
              <li
                key={event.id}
                className={`grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-start gap-3 border-b border-ink/30 py-4 ${
                  cancelled ? "cancelled" : ""
                }`}
              >
                <div className="civic-datebox">
                  <div className="civic-datebox-dow">{d.day}</div>
                  <div className="civic-datebox-day">{d.label}</div>
                </div>
                <div className="min-w-0">
                  <p className="font-display text-[1.05rem] leading-snug font-bold text-ink md:text-[1.15rem]">
                    {event.title}
                  </p>
                  <p className="mt-1 text-sm text-muted">{event.place}</p>
                </div>
                <p className="pt-1 text-right text-xs font-extrabold tracking-wide text-muted-2 uppercase">
                  {civicTime(event.starts_at)}
                </p>
              </li>
            );
          })}
          {events.length === 0 ? (
            <li className="py-6 text-sm text-muted">
              No upcoming meetings in the pull yet.
            </li>
          ) : null}
        </ul>

        <aside className="space-y-5">
          <div className="border border-ink p-4">
            <h2 className="font-display text-sm font-extrabold tracking-[0.08em] text-ink uppercase">
              Where this comes from
            </h2>
            <p className="mt-2 font-serif text-sm leading-relaxed text-muted-2">
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
