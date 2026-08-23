"use client";

import { useMemo, useState } from "react";
import { formatCivicDate, formatEventWhenParts } from "@/lib/dates";
import { SCHOOL_TOGGLE_ALWAYS } from "@/lib/schools";
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
 * District tabs for /schools. TCAPS is always the default selection —
 * even when GTACS has more rows.
 */
export function SchoolsDistrictToggle({
  districts,
}: {
  districts: SchoolsDistrictBlock[];
}) {
  const byName = useMemo(
    () => new Map(districts.map((d) => [d.district, d])),
    [districts],
  );

  const tabs = useMemo(() => {
    const names: string[] = [];
    for (const name of SCHOOL_TOGGLE_ALWAYS) {
      if (byName.has(name)) names.push(name);
    }
    for (const block of districts) {
      if (
        (SCHOOL_TOGGLE_ALWAYS as readonly string[]).includes(block.district)
      ) {
        continue;
      }
      if (itemCount(block) > 0) names.push(block.district);
    }
    return names;
  }, [districts, byName]);

  const [active, setActive] = useState(() =>
    tabs.includes("TCAPS") ? "TCAPS" : (tabs[0] ?? "TCAPS"),
  );

  const selected = byName.get(active) ?? byName.get("TCAPS") ?? districts[0];
  const count = selected ? itemCount(selected) : 0;

  return (
    <div className="schools-toggle">
      <div
        className="schools-toggle-tabs"
        role="tablist"
        aria-label="School district"
      >
        {tabs.map((name) => {
          const on = name === active;
          return (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={on}
              className={
                on ? "schools-toggle-tab schools-toggle-tab-on" : "schools-toggle-tab"
              }
              onClick={() => setActive(name)}
            >
              {name}
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
              {count === 0
                ? "No official dates in the pull yet"
                : `${count} important date${count === 1 ? "" : "s"}`}
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

          {selected.months.length === 0 ? (
            <p className="schools-district-empty">
              No official dates in the pull yet — we do not invent half days
              for {selected.district}.
            </p>
          ) : (
            selected.months.map((month) => (
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
            ))
          )}
        </section>
      ) : null}
    </div>
  );
}
