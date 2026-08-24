const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const DETROIT = "America/Detroit";

export function detroitParts(at: Date): {
  weekday: string;
  month: string;
  day: number;
  year: number;
  hour: number;
  minute: number;
  second: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DETROIT,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return {
    weekday: get("weekday"),
    month: get("month"),
    day: Number(get("day")),
    year: Number(get("year")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
  };
}

export function monthNumber(name: string): number {
  const idx = MONTHS.indexOf(name as (typeof MONTHS)[number]);
  return idx >= 0 ? idx + 1 : 1;
}

/** YYYY-MM-DD for a Detroit wall date (date inputs). */
export function formatDetroitDateInput(at: Date | string): string {
  return detroitDayKey(at);
}

/** HH:mm for a Detroit wall clock (time inputs). */
export function formatDetroitTimeInput(at: Date | string): string {
  const d = typeof at === "string" ? new Date(at) : at;
  const p = detroitParts(d);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

/**
 * Next 8:00am America/Detroit morning.
 * Before 8am today → today 8:00; at/after 8am → tomorrow 8:00.
 */
export function nextDetroitMorning8am(now = new Date()): Date {
  const p = detroitParts(now);
  const today8 = detroitWallToUtc(
    p.year,
    monthNumber(p.month),
    p.day,
    8,
    0,
    0,
  );
  if (now.getTime() < today8.getTime()) return today8;
  const localMidnight = detroitWallToUtc(
    p.year,
    monthNumber(p.month),
    p.day,
    0,
    0,
    0,
  );
  const tomorrow = detroitParts(
    new Date(localMidnight.getTime() + 30 * 60 * 60 * 1000),
  );
  return detroitWallToUtc(
    tomorrow.year,
    monthNumber(tomorrow.month),
    tomorrow.day,
    8,
    0,
    0,
  );
}

/** Parse Detroit date + time form values into a UTC Date (or null if empty/invalid). */
export function parseDetroitDateTimeInputs(
  dateYmd: string,
  timeHm: string,
): Date | null {
  const date = dateYmd.trim();
  const time = timeHm.trim();
  if (!date && !time) return null;
  if (!date || !time) return null;
  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const t = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!m || !t) return null;
  const hour = Number(t[1]);
  const minute = Number(t[2]);
  if (hour > 23 || minute > 59) return null;
  return detroitWallToUtc(
    Number(m[1]),
    Number(m[2]),
    Number(m[3]),
    hour,
    minute,
    0,
  );
}

/** Convert a Detroit wall-clock to a UTC Date. */
export function detroitWallToUtc(
  year: number,
  month: number,
  day: number,
  hour = 12,
  minute = 0,
  second = 0,
): Date {
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  for (let i = 0; i < 4; i++) {
    const shown = detroitParts(new Date(utcMs));
    const shownAsUtc = Date.UTC(
      shown.year,
      monthNumber(shown.month) - 1,
      shown.day,
      shown.hour,
      shown.minute,
      shown.second,
    );
    const want = Date.UTC(year, month - 1, day, hour, minute, second);
    utcMs += want - shownAsUtc;
  }
  return new Date(utcMs);
}

/** True when the import row is a calendar date with no clock (YYYY-MM-DD). */
export function isDateOnlyStartsAt(raw: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(raw.trim());
}

/** Detroit calendar day key (YYYY-MM-DD) for an instant. */
export function detroitDayKey(at: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DETROIT,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(typeof at === "string" ? new Date(at) : at);
}

/** True when the instant is 00:00 America/Detroit (date-only sort anchor). */
export function isDetroitMidnight(iso: string): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DETROIT,
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(d);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "1");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "1");
  return hour === 0 && minute === 0;
}

/**
 * Parse an ISO / datetime for event import.
 * - With Z or ±offset: absolute instant.
 * - Naive `YYYY-MM-DDTHH:mm[:ss]`: America/Detroit wall time (not Worker UTC).
 * - Date-only `YYYY-MM-DD`: midnight Detroit (not noon — never invent a showtime).
 * Never invents "tomorrow" from relative words.
 */
export function parseEventStartsAt(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^(today|tomorrow|tonight|next\b)/i.test(trimmed)) return null;

  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const m = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (m) {
    return detroitWallToUtc(
      Number(m[1]),
      Number(m[2]),
      Number(m[3]),
      m[4] != null ? Number(m[4]) : 0,
      m[5] != null ? Number(m[5]) : 0,
      m[6] != null ? Number(m[6]) : 0,
    );
  }

  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
}

const WEEKDAY_INDEX: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

/**
 * Next occurrences for listed weekdays at a Detroit wall time.
 * Recurring Visit TC rows expand from weekdays — never "tomorrow" or noon guesses.
 */
export function expandDetroitWeekdayOccurrences(
  weekdays: string[],
  timeHHmm: string,
  options: { now?: Date; count?: number } = {},
): Date[] {
  const now = options.now ?? new Date();
  const count = Math.min(Math.max(options.count ?? 2, 1), 8);
  const timeM = timeHHmm.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!timeM) return [];
  const hour = Number(timeM[1]);
  const minute = Number(timeM[2]);
  if (hour > 23 || minute > 59) return [];

  const wanted = new Set(
    weekdays
      .map((w) => WEEKDAY_INDEX[w.trim().toLowerCase()])
      .filter((n): n is number => n !== undefined),
  );
  if (wanted.size === 0) return [];

  const out: Date[] = [];
  // Walk Detroit calendar days one at a time (never invent "tomorrow" as a shortcut).
  let cursor = detroitParts(now);
  for (let step = 0; step < 70 && out.length < count; step++) {
    const occurrence = detroitWallToUtc(
      cursor.year,
      monthNumber(cursor.month),
      cursor.day,
      hour,
      minute,
      0,
    );
    const weekdayIdx = WEEKDAYS.indexOf(
      cursor.weekday as (typeof WEEKDAYS)[number],
    );
    if (
      wanted.has(weekdayIdx) &&
      occurrence.getTime() >= now.getTime() - 60 * 60 * 1000
    ) {
      out.push(occurrence);
    }
    // Advance exactly one Detroit calendar day via local midnight+30h → next local morning.
    const localMidnight = detroitWallToUtc(
      cursor.year,
      monthNumber(cursor.month),
      cursor.day,
      0,
      0,
      0,
    );
    cursor = detroitParts(new Date(localMidnight.getTime() + 30 * 60 * 60 * 1000));
  }
  return out;
}

export function formatHeaderDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: DETROIT,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: DETROIT,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

/** Dateline for originals: date + local time in America/Detroit. */
export function formatStoryDateline(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return formatShortDate(iso);
  const date = new Intl.DateTimeFormat("en-US", {
    timeZone: DETROIT,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: DETROIT,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
  return `${date}, ${time}`;
}

export function formatCivicDate(iso: string): {
  day: string;
  label: string;
  /** America/Detroit YYYY-MM for month section breaks. */
  monthKey: string;
  /** Full month name, e.g. September. */
  monthName: string;
  /** Uppercase month abbr, e.g. SEP. */
  monthAbbr: string;
} {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: DETROIT,
    weekday: "short",
  })
    .format(d)
    .toUpperCase();
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: DETROIT,
    day: "numeric",
  }).format(d);
  const monthKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: DETROIT,
    year: "numeric",
    month: "2-digit",
  }).format(d);
  const monthName = new Intl.DateTimeFormat("en-US", {
    timeZone: DETROIT,
    month: "long",
  }).format(d);
  const monthAbbr = new Intl.DateTimeFormat("en-US", {
    timeZone: DETROIT,
    month: "short",
  })
    .format(d)
    .toUpperCase()
    .replace(/\.$/, "");
  return { day, label, monthKey, monthName, monthAbbr };
}

export function formatRelative(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const diffMs = now.getTime() - d.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: DETROIT,
    weekday: "short",
  }).format(d);
}

/** Around the bay day label — always weekday short (Fri), never “15h ago”. */
export function formatBayDay(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: DETROIT,
    weekday: "short",
  }).format(new Date(iso));
}

export function formatEventWhen(
  iso: string,
  now = new Date(),
  opts?: { timeUnknown?: boolean },
): string {
  const parts = formatEventWhenParts(iso, now, opts);
  return `${parts.dayLabel}, ${parts.time}`;
}

/**
 * Time-first parts for Tonight / What's on night-out UI.
 * Date-only / midnight Detroit → time is "—" (never invent 12:00 PM).
 */
export function formatEventWhenParts(
  iso: string,
  now = new Date(),
  opts?: { timeUnknown?: boolean },
): { dayLabel: string; time: string; dayKey: string } {
  const d = new Date(iso);
  const detroitNow = detroitDayKey(now);
  const detroitEvent = detroitDayKey(d);

  const hideClock = Boolean(opts?.timeUnknown) || isDetroitMidnight(iso);
  const time = hideClock
    ? "—"
    : new Intl.DateTimeFormat("en-US", {
        timeZone: DETROIT,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
        .format(d)
        .toUpperCase();

  const [ny, nm, nd] = detroitNow.split("-").map(Number);
  const [ey, em, ed] = detroitEvent.split("-").map(Number);
  const startOfToday = Date.UTC(ny, nm - 1, nd);
  const startOfEvent = Date.UTC(ey, em - 1, ed);
  const dayDiff = Math.round((startOfEvent - startOfToday) / 86_400_000);

  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: DETROIT,
    weekday: "short",
  })
    .format(d)
    .toUpperCase();

  let dayLabel = `${weekday} ${em}/${ed}`;
  if (dayDiff === 0) dayLabel = "TONIGHT";
  else if (dayDiff === 1) dayLabel = "TOMORROW";

  return { dayLabel, time, dayKey: detroitEvent };
}

/** Homepage bay dateline, e.g. "Saturday, August 22 · Traverse City". */
export function formatBayDateline(at = new Date()): string {
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: DETROIT,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(at);
  return `${day} · Traverse City`;
}

export function isWeekendWindow(iso: string, now = new Date()): boolean {
  const d = new Date(iso);
  const end = new Date(now.getTime() + 3 * 86_400_000);
  return d >= now && d <= end;
}

export function emailDateLabel(date = new Date()): string {
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: DETROIT,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
  return `${label.toUpperCase()} · TRAVERSE CITY`;
}
