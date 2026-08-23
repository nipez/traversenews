"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCivicDate, formatEventWhenParts } from "@/lib/dates";
import type { SchoolCalendarItem } from "@/lib/types";

export type SchoolsDistrictBlock = {
  district: string;
  calendarUrl: string | null;
  /** Optional year PDF (TCAPS) — link out only, never hosted. */
  calendarPdfUrl: string | null;
  months: Array<{
    key: string;
    name: string;
    items: SchoolCalendarItem[];
  }>;
};

function schoolClock(item: SchoolCalendarItem): string {
  return formatEventWhenParts(item.starts_at, new Date(), {
    timeUnknown: item.time_unknown,
  }).time;
}

function itemCount(block: SchoolsDistrictBlock): number {
  return block.months.reduce((n, m) => n + m.items.length, 0);
}

/**
 * District tabs for /schools. Only districts with imported Important dates.
 * TCAPS is first when present; empty districts stay hidden until KV has rows.
 */
export function SchoolsDistrictToggle({
  districts,
}: {
  districts: SchoolsDistrictBlock[];
}) {
  const tabs = useMemo(
    () => districts.filter((block) => itemCount(block) > 0),
    [districts],
  );

  const [active, setActive] = useState(
    () => tabs.find((d) => d.district === "TCAPS")?.district ?? tabs[0]?.district ?? "",
  );

  useEffect(() => {
    if (tabs.length === 0) {
      setActive("");
      return;
    }
    if (!tabs.some((d) => d.district === active)) {
      setActive(
        tabs.find((d) => d.district === "TCAPS")?.district ?? tabs[0].district,
      );
    }
  }, [tabs, active]);

  const selected = tabs.find((d) => d.district === active) ?? tabs[0];
  const count = selected ? itemCount(selected) : 0;

  if (tabs.length === 0) {
    return (
      <p className="schools-district-empty">
        No official district dates in the pull yet — we do not invent half days.
      </p>
    );
  }

  return (
    <div className="schools-toggle">
      <div
        className="schools-toggle-tabs"
        role="tablist"
        aria-label="School district"
      >
        {tabs.map((block) => {
          const on = block.district === selected?.district;
          return (
            <button
              key={block.district}
              type="button"
              role="tab"
              aria-selected={on}
              className={
                on ? "schools-toggle-tab schools-toggle-tab-on" : "schools-toggle-tab"
              }
              onClick={() => setActive(block.district)}
            >
              {block.district}
            </button>
          );
        })}
      </div>

      {selected ? (
        <section
          className="schools-district"
          role="tabpanel"
          aria-label={selected.district}
        >
          <header className="schools-district-head">
            <p className="schools-district-kicker">District</p>
            <h2 className="schools-district-hed">{selected.district}</h2>
            <p className="schools-district-meta">
              {count} important date{count === 1 ? "" : "s"}
            </p>
            {selected.calendarUrl || selected.calendarPdfUrl ? (
              <p className="schools-district-cal">
                {selected.calendarUrl ? (
                  <a
                    href={selected.calendarUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Full calendar →
                  </a>
                ) : null}
                {selected.calendarUrl && selected.calendarPdfUrl ? (
                  <span className="schools-district-cal-sep" aria-hidden>
                    {" · "}
                  </span>
                ) : null}
                {selected.calendarPdfUrl ? (
                  <a
                    href={selected.calendarPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Year PDF →
                  </a>
                ) : null}
              </p>
            ) : null}
          </header>

          {selected.months.map((month) => (
            <div key={month.key} className="schools-month">
              <h3 className="schools-month-hed">{month.name}</h3>
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
                        {item.place && item.place !== "District" ? (
                          <p className="schools-place">{item.place}</p>
                        ) : null}
                      </div>
                      <p className="schools-time">{clock}</p>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
