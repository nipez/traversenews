"use client";

import { useMemo, useState } from "react";
import {
  ATHLETICS_CORE_SCHOOLS,
  ATHLETICS_SURROUNDING_SCHOOLS,
  displayAthleticsSchool,
  filterAthleticsSlate,
  gameMatchesSchoolFilter,
  groupAthleticsByDay,
  isSurroundingAthleticsGame,
  isVarsityGameTitle,
} from "@/lib/athletics";
import { formatEventWhenParts } from "@/lib/dates";
import type { AthleticsGame } from "@/lib/types";

function gameClock(game: AthleticsGame): string {
  return formatEventWhenParts(game.starts_at, new Date(), {
    timeUnknown: game.time_unknown,
  }).time;
}

function WeekDayList({
  games,
  empty,
}: {
  games: AthleticsGame[];
  empty: string;
}) {
  const days = groupAthleticsByDay(games);
  if (days.length === 0) {
    return <p className="sports-week-empty">{empty}</p>;
  }
  return (
    <div className="sports-week-days">
      {days.map((day) => (
        <div key={day.key} className="sports-week-day">
          <h3 className="sports-week-day-label">{day.label}</h3>
          <ul className="sports-week-list">
            {day.items.map((game) => {
              const varsity = isVarsityGameTitle(game.title);
              const time = gameClock(game);
              const inner = (
                <>
                  <span className="sports-week-time">{time}</span>
                  <span className="sports-week-school">
                    {displayAthleticsSchool(game)}
                  </span>
                  <span
                    className={
                      varsity
                        ? "sports-week-title sports-week-title-varsity"
                        : "sports-week-title"
                    }
                  >
                    {game.title}
                  </span>
                  {game.place ? (
                    <span className="sports-week-place">{game.place}</span>
                  ) : null}
                </>
              );
              return (
                <li key={game.id} className="sports-week-item">
                  {game.url ? (
                    <a
                      href={game.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sports-week-link"
                    >
                      {inner}
                    </a>
                  ) : (
                    <div className="sports-week-link sports-week-nolink">
                      {inner}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/**
 * Sports This week + Next week. TC core by default; Surrounding reveals
 * map-ring schools. Shared school filters. Never invents kickoffs.
 */
export function SportsThisWeek({
  thisWeek,
  nextWeek = [],
}: {
  thisWeek: AthleticsGame[];
  nextWeek?: AthleticsGame[];
}) {
  const chipPool = useMemo(
    () => [...thisWeek, ...nextWeek],
    [thisWeek, nextWeek],
  );

  const surroundingPresent = useMemo(() => {
    const have = new Set(
      chipPool.filter(isSurroundingAthleticsGame).map((g) => g.school),
    );
    return ATHLETICS_SURROUNDING_SCHOOLS.filter((name) => have.has(name));
  }, [chipPool]);

  const [showSurrounding, setShowSurrounding] = useState(false);
  const [activeSchool, setActiveSchool] = useState<string | null>(null);

  const filterOpts = useMemo(
    () => ({
      includeSurrounding: showSurrounding,
      school: activeSchool,
    }),
    [showSurrounding, activeSchool],
  );

  const scopedThis = useMemo(
    () => filterAthleticsSlate(thisWeek, filterOpts),
    [thisWeek, filterOpts],
  );
  const scopedNext = useMemo(
    () => filterAthleticsSlate(nextWeek, filterOpts),
    [nextWeek, filterOpts],
  );

  const surroundingCount = surroundingPresent.length;
  const surroundingLabel =
    surroundingCount === 1
      ? "1 more school"
      : `${surroundingCount} more schools`;

  const coreChips = ATHLETICS_CORE_SCHOOLS.filter((name) =>
    chipPool.some((g) => gameMatchesSchoolFilter(g, name)),
  );

  return (
    <section className="sports-week" aria-label="Prep calendar">
      <h2 className="sports-week-hed">This week</h2>
      <p className="sports-week-dek">
        Traverse City prep — Central, West, TC St. Francis, TC Christian.
      </p>

      <div
        className="sports-week-filters"
        role="toolbar"
        aria-label="School filter"
      >
        {coreChips.map((school) => {
          const on = activeSchool === school;
          return (
            <button
              key={school}
              type="button"
              className={
                on
                  ? "sports-week-chip sports-week-chip-on"
                  : "sports-week-chip"
              }
              aria-pressed={on}
              onClick={() =>
                setActiveSchool((cur) => (cur === school ? null : school))
              }
            >
              {school}
            </button>
          );
        })}
        {surroundingCount > 0 ? (
          <button
            type="button"
            className={
              showSurrounding
                ? "sports-surrounding-btn sports-surrounding-btn-on"
                : "sports-surrounding-btn"
            }
            aria-expanded={showSurrounding}
            aria-controls="sports-surrounding-chips"
            onClick={() => {
              const next = !showSurrounding;
              if (
                !next &&
                activeSchool &&
                (ATHLETICS_SURROUNDING_SCHOOLS as readonly string[]).includes(
                  activeSchool,
                )
              ) {
                setActiveSchool(null);
              }
              setShowSurrounding(next);
            }}
          >
            {showSurrounding ? "Surrounding" : surroundingLabel}
            <span className="sports-surrounding-caret" aria-hidden="true">
              {showSurrounding ? "▴" : "▾"}
            </span>
          </button>
        ) : null}
      </div>

      {showSurrounding && surroundingCount > 0 ? (
        <div
          id="sports-surrounding-chips"
          className="sports-week-filters sports-week-filters-surrounding"
          role="toolbar"
          aria-label="Surrounding schools"
        >
          {surroundingPresent.map((school) => {
            const on = activeSchool === school;
            return (
              <button
                key={school}
                type="button"
                className={
                  on
                    ? "sports-week-chip sports-week-chip-on"
                    : "sports-week-chip"
                }
                aria-pressed={on}
                onClick={() =>
                  setActiveSchool((cur) => (cur === school ? null : school))
                }
              >
                {school}
              </button>
            );
          })}
        </div>
      ) : null}

      <WeekDayList
        games={scopedThis}
        empty="No games on the calendar this week."
      />

      <h2 className="sports-week-hed sports-week-hed-next">Next week</h2>
      <WeekDayList
        games={scopedNext}
        empty="No games on the calendar next week."
      />
    </section>
  );
}
