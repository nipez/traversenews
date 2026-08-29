"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  detroitDayKey,
  formatCivicDate,
  formatShowDateRange,
  parseEventStartsAt,
} from "@/lib/dates";
import { venuesPresentInListings } from "@/lib/shows";
import type { ShowListing } from "@/lib/types";

function labelFromDayKey(key: string): string {
  const noon = parseEventStartsAt(`${key}T12:00`);
  const d = noon ?? new Date(`${key}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Detroit",
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(d);
}

function runRange(item: ShowListing): string | null {
  if (!item.ends_at) return null;
  if (detroitDayKey(item.ends_at) === detroitDayKey(item.starts_at)) return null;
  return formatShowDateRange(item.starts_at, item.ends_at);
}

function groupByStartDay(items: ShowListing[]) {
  const groups = new Map<string, ShowListing[]>();
  for (const item of items) {
    const key = detroitDayKey(item.starts_at);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, list]) => ({
      key,
      dayLabel: labelFromDayKey(key),
      items: [...list].sort((a, b) => a.title.localeCompare(b.title)),
    }));
}

function ShowDay({
  group,
}: {
  group: ReturnType<typeof groupByStartDay>[number];
}) {
  return (
    <>
      <li className="civic-month-hed">{group.dayLabel}</li>
      {group.items.map((item) => {
        const d = formatCivicDate(item.starts_at);
        const range = runRange(item);
        const title = item.url ? (
          <a href={item.url} target="_blank" rel="noopener noreferrer">
            {item.title}
          </a>
        ) : (
          item.title
        );
        return (
          <li key={item.id} className="civic-agenda-row">
            <div className="civic-datebox">
              <div className="civic-datebox-dow">{d.day}</div>
              <div className="civic-datebox-day">{d.label}</div>
              <div className="civic-datebox-month">{d.monthAbbr}</div>
            </div>
            <div className="civic-agenda-copy">
              <p className="civic-agenda-title">{title}</p>
              <p className="civic-agenda-place">{item.venue}</p>
              {range ? <p className="civic-agenda-place">{range}</p> : null}
            </div>
          </li>
        );
      })}
    </>
  );
}

function ShowAgenda({
  groups,
  empty,
}: {
  groups: ReturnType<typeof groupByStartDay>;
  empty?: string;
}) {
  if (groups.length === 0) {
    return empty ? <li className="civic-empty">{empty}</li> : null;
  }
  return (
    <>
      {groups.map((group) => (
        <ShowDay key={group.key} group={group} />
      ))}
    </>
  );
}

/**
 * Sports-style venue chips for /shows. Default = all venues;
 * click filters This week + Coming; click again clears.
 */
export function ShowsVenueFilter({
  thisWeek,
  coming,
}: {
  thisWeek: ShowListing[];
  coming: ShowListing[];
}) {
  const [activeVenue, setActiveVenue] = useState<string | null>(null);

  const venues = useMemo(
    () => venuesPresentInListings([...thisWeek, ...coming]),
    [thisWeek, coming],
  );

  const scopedThis = useMemo(
    () =>
      activeVenue
        ? thisWeek.filter((s) => s.venue === activeVenue)
        : thisWeek,
    [thisWeek, activeVenue],
  );
  const scopedComing = useMemo(
    () =>
      activeVenue
        ? coming.filter((s) => s.venue === activeVenue)
        : coming,
    [coming, activeVenue],
  );

  const thisGroups = useMemo(
    () => groupByStartDay(scopedThis),
    [scopedThis],
  );
  const comingGroups = useMemo(
    () => groupByStartDay(scopedComing),
    [scopedComing],
  );

  const filterEmpty =
    activeVenue != null &&
    scopedThis.length === 0 &&
    scopedComing.length === 0;

  return (
    <>
      {venues.length > 0 ? (
        <div
          className="sports-week-filters shows-venue-filters"
          role="toolbar"
          aria-label="Venue filter"
        >
          {venues.map((venue) => {
            const on = activeVenue === venue;
            return (
              <button
                key={venue}
                type="button"
                className={
                  on
                    ? "sports-week-chip sports-week-chip-on"
                    : "sports-week-chip"
                }
                aria-pressed={on}
                onClick={() =>
                  setActiveVenue((cur) => (cur === venue ? null : venue))
                }
              >
                {venue}
              </button>
            );
          })}
        </div>
      ) : null}

      {filterEmpty ? (
        <ul className="civic-agenda">
          <li className="civic-empty">
            Nothing listed at this venue this week.
          </li>
        </ul>
      ) : (
        <>
          <ul className="civic-agenda">
            <li className="civic-month-hed">This week</li>
            <ShowAgenda
              groups={thisGroups}
              empty={
                activeVenue
                  ? "Nothing listed at this venue this week."
                  : "No movies or plays this week."
              }
            />
          </ul>
          {comingGroups.length > 0 ? (
            <ul className="civic-agenda">
              <li className="civic-month-hed">Coming up</li>
              <ShowAgenda groups={comingGroups} />
            </ul>
          ) : null}
        </>
      )}

      <p className="sports-foot">
        Also on <Link href="/events">Events</Link> /{" "}
        <Link href="/">Today</Link>.
      </p>
    </>
  );
}
