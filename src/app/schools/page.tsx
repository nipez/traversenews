import { DeskRail } from "@/components/DeskRail";
import { PublicShell } from "@/components/PublicShell";
import { formatCivicDate, formatEventWhenParts } from "@/lib/dates";
import { getAppData } from "@/lib/data/store";
import {
  groupSchoolDaysByDistrict,
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
  // Always emit TCAPS → GTACS → neighbors with heds, even when a district is empty.
  const districts = groupSchoolDaysByDistrict(upcoming, { includeEmpty: true });
  const anyDates = districts.some((d) => d.months.length > 0);

  return (
    <PublicShell active="/schools" header="compact">
      <div className="about-layout schools-layout">
        <div className="about-essay schools-main">
          <header className="schools-hero">
            <p className="schools-kicker">Parents</p>
            <h1 className="schools-hed">Schools</h1>
            <p className="schools-dek">
              Important dates by district — half days, no-school, orientation,
              conferences, spring break, first and last day. Not PTA nights,
              not sports, not every elementary listing. We do not invent half
              days.
            </p>
          </header>

          {!anyDates ? (
            <p className="schools-empty">
              No Important dates in the pull yet — we do not invent half days
              or first days of school. Districts below stay labeled so TCAPS
              and GTACS never read as one calendar.
            </p>
          ) : null}

          <div className="schools-districts">
            {districts.map((block) => {
              const count = block.months.reduce(
                (n, m) => n + m.items.length,
                0,
              );
              return (
                <section
                  key={block.district}
                  className="schools-district"
                  aria-labelledby={`schools-${block.district.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  <header className="schools-district-head">
                    <p className="schools-district-kicker">District</p>
                    <h2
                      id={`schools-${block.district.replace(/\s+/g, "-").toLowerCase()}`}
                      className="schools-district-hed"
                    >
                      {block.district}
                    </h2>
                    <p className="schools-district-meta">
                      {count === 0
                        ? "No official dates in the pull yet"
                        : `${count} important date${count === 1 ? "" : "s"}`}
                    </p>
                  </header>

                  {block.months.length === 0 ? (
                    <p className="schools-district-empty">
                      Empty for now — we do not invent half days for{" "}
                      {block.district}.
                    </p>
                  ) : (
                    block.months.map((month) => (
                      <div key={month.key} className="schools-month">
                        <h3 className="schools-month-hed">{month.name}</h3>
                        <ul className="schools-list">
                          {month.items.map((item) => {
                            const d = formatCivicDate(item.starts_at);
                            const clock = schoolClock(item);
                            return (
                              <li key={item.id} className="schools-row">
                                <div className="schools-datebox">
                                  <div className="schools-datebox-dow">
                                    {d.day}
                                  </div>
                                  <div className="schools-datebox-day">
                                    {d.label}
                                  </div>
                                  <div className="schools-datebox-month">
                                    {d.monthAbbr}
                                  </div>
                                </div>
                                <div className="schools-copy">
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
                                    <p className="schools-title">
                                      {item.title}
                                    </p>
                                  )}
                                  {item.place && item.place !== "District" ? (
                                    <p className="schools-place">
                                      {item.place}
                                    </p>
                                  ) : null}
                                </div>
                                <p className="schools-time">{clock}</p>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))
                  )}
                </section>
              );
            })}
          </div>
        </div>

        <DeskRail active="/schools" />
      </div>
    </PublicShell>
  );
}
