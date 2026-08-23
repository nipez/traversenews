import { DeskRail } from "@/components/DeskRail";
import { PublicShell } from "@/components/PublicShell";
import { formatCivicDate, formatEventWhenParts } from "@/lib/dates";
import { getAppData } from "@/lib/data/store";
import {
  groupSchoolDaysByMonth,
  selectUpcomingSchoolDays,
} from "@/lib/schools";
import type { SchoolCalendarItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Schools",
};

function schoolClock(item: SchoolCalendarItem): string {
  return formatEventWhenParts(item.starts_at, new Date(), {
    timeUnknown: item.time_unknown,
  }).time;
}

export default async function SchoolsPage() {
  const data = await getAppData();
  const upcoming = selectUpcomingSchoolDays(data.schools ?? []);
  const months = groupSchoolDaysByMonth(upcoming);

  return (
    <PublicShell active="/schools" header="compact">
      <div className="about-layout schools-layout">
        <div className="about-essay schools-main">
          <header className="schools-hero">
            <p className="schools-kicker">Parents</p>
            <h1 className="schools-hed">Schools</h1>
            <p className="schools-dek">
              District academic calendars — no-school days, half days,
              conferences, and breaks. Nights out stay on Events; games stay on
              Sports. We do not invent half days.
            </p>
          </header>

          {months.length === 0 ? (
            <p className="schools-empty">
              No district calendar days in the pull yet — we do not invent
              half days or first days of school.
            </p>
          ) : (
            <div className="schools-months">
              {months.map((month) => (
                <section key={month.key} className="schools-month">
                  <h2 className="schools-month-hed">{month.name}</h2>
                  <ul className="schools-list">
                    {month.items.map((item) => {
                      const d = formatCivicDate(item.starts_at);
                      const clock = schoolClock(item);
                      return (
                        <li key={item.id} className="schools-row">
                          <div className="schools-datebox">
                            <div className="schools-datebox-dow">{d.day}</div>
                            <div className="schools-datebox-day">{d.label}</div>
                            <div className="schools-datebox-month">
                              {d.monthAbbr}
                            </div>
                          </div>
                          <div className="schools-copy">
                            <p className="schools-district">{item.district}</p>
                            {item.url ? (
                              <p className="schools-title">
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {item.title}
                                </a>
                              </p>
                            ) : (
                              <p className="schools-title">{item.title}</p>
                            )}
                            {item.place ? (
                              <p className="schools-place">{item.place}</p>
                            ) : null}
                          </div>
                          <p className="schools-time">{clock}</p>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>

        <DeskRail active="/schools" />
      </div>
    </PublicShell>
  );
}
