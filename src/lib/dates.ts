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

const SHORT_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function formatHeaderDate(date = new Date()): string {
  return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;
}

/** Dateline for originals: date + local time in America/Detroit. */
export function formatStoryDateline(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return formatShortDate(iso);
  const date = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Detroit",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Detroit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
  return `${date}, ${time}`;
}

export function formatCivicDate(iso: string): { day: string; label: string } {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Detroit",
    weekday: "short",
  })
    .format(d)
    .toUpperCase();
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Detroit",
    day: "numeric",
  }).format(d);
  return { day, label };
}

export function formatRelative(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const diffMs = now.getTime() - d.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return SHORT_WEEKDAYS[d.getDay()];
  return SHORT_WEEKDAYS[d.getDay()];
}

export function formatEventWhen(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const detroitNow = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Detroit",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const detroitEvent = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Detroit",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);

  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Detroit",
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
    timeZone: "America/Detroit",
    weekday: "short",
  })
    .format(d)
    .toUpperCase();

  if (dayDiff === 0) return `TONIGHT, ${time}`;
  if (dayDiff === 1) return `TOMORROW, ${time}`;
  return `${weekday} ${em}/${ed}, ${time}`;
}

export function isWeekendWindow(iso: string, now = new Date()): boolean {
  const d = new Date(iso);
  const end = new Date(now);
  end.setDate(end.getDate() + 3);
  end.setHours(23, 59, 59, 999);
  return d >= now && d <= end;
}

export function emailDateLabel(date = new Date()): string {
  return `${SHORT_WEEKDAYS[date.getDay()].toUpperCase()}, ${MONTHS[date.getMonth()].slice(0, 3).toUpperCase()} ${date.getDate()} · TRAVERSE CITY`;
}
