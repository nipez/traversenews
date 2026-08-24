"use client";

import { useMemo, useState } from "react";
import { formatCivicDate, formatEventWhenParts } from "@/lib/dates";
import {
  isCoreSchoolDistrict,
  schoolDistrictChipLabel,
} from "@/lib/schools";
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

function pickDefaultDistrict(tabs: SchoolsDistrictBlock[]): string {
  return tabs.find((d) => d.district === "TCAPS")?.district ?? tabs[0]?.district ?? "";
}

/**
 * District tabs for /schools. Only districts with imported Important dates.
 * TC core chips always visible; map-ring districts behind Surrounding.
 * TCAPS is first when present; empty districts stay hidden until data exists.
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

  const coreTabs = useMemo(
    () => tabs.filter((block) => isCoreSchoolDistrict(block.district)),
    [tabs],
  );
  const surroundingTabs = useMemo(
    () => tabs.filter((block) => !isCoreSchoolDistrict(block.district)),
    [tabs],
  );

  const [showSurrounding, setShowSurrounding] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  const selectable = showSurrounding ? tabs : coreTabs;

  const selected = useMemo(() => {
    if (selectable.length === 0) return undefined;
    if (active && selectable.some((d) => d.district === active)) {
      return selectable.find((d) => d.district === active);
    }
    return (
      selectable.find((d) => d.district === "TCAPS") ?? selectable[0]
    );
  }, [selectable, active]);

  const count = selected ? itemCount(selected) : 0;
  const surroundingCount = surroundingTabs.length;
  const surroundingLabel =
    surroundingCount === 1
      ? "1 more district"
      : `${surroundingCount} more districts`;

  if (tabs.length === 0) {
    return (
      <p className="schools-district-empty">
        No official district dates yet.
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
        {coreTabs.map((block) => {
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
              {schoolDistrictChipLabel(block.district)}
            </button>
          );
        })}
        {surroundingCount > 0 ? (
          <button
            type="button"
            className={
              showSurrounding
                ? "schools-surrounding-btn schools-surrounding-btn-on"
                : "schools-surrounding-btn"
            }
            aria-expanded={showSurrounding}
            aria-controls="schools-surrounding-tabs"
            onClick={() => {
              const next = !showSurrounding;
              if (!next && selected && !isCoreSchoolDistrict(selected.district)) {
                setActive(pickDefaultDistrict(coreTabs));
              }
              setShowSurrounding(next);
            }}
          >
            {showSurrounding ? "Surrounding" : surroundingLabel}
            <span className="schools-surrounding-caret" aria-hidden="true">
              {showSurrounding ? "▴" : "▾"}
            </span>
          </button>
        ) : null}
      </div>

      {showSurrounding && surroundingCount > 0 ? (
        <div
          id="schools-surrounding-tabs"
          className="schools-toggle-tabs schools-toggle-tabs-surrounding"
          role="tablist"
          aria-label="Surrounding districts"
        >
          {surroundingTabs.map((block) => {
            const on = block.district === selected?.district;
            return (
              <button
                key={block.district}
                type="button"
                role="tab"
                aria-selected={on}
                className={
                  on
                    ? "schools-toggle-tab schools-toggle-tab-on"
                    : "schools-toggle-tab"
                }
                onClick={() => setActive(block.district)}
              >
                {schoolDistrictChipLabel(block.district)}
              </button>
            );
          })}
        </div>
      ) : null}

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
              <div className="schools-district-sources" aria-label="Official calendars">
                {selected.calendarUrl ? (
                  <a
                    className="schools-source-btn"
                    href={selected.calendarUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Full calendar
                    <span aria-hidden="true"> →</span>
                  </a>
                ) : null}
                {selected.calendarPdfUrl ? (
                  <a
                    className="schools-source-btn schools-source-btn-pdf"
                    href={selected.calendarPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Year PDF
                    <span aria-hidden="true"> →</span>
                  </a>
                ) : null}
              </div>
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
