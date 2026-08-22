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

export function formatCivicDate(iso: string): { day: string; label: string } {
  const d = new Date(iso);
  return {
    day: SHORT_WEEKDAYS[d.getDay()].toUpperCase(),
    label: String(d.getDate()),
  };
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
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfEvent = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayDiff = Math.round(
    (startOfEvent.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24),
  );

  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).toUpperCase();

  if (dayDiff === 0) return `TONIGHT, ${time}`;
  if (dayDiff === 1) return `TOMORROW, ${time}`;
  return `${SHORT_WEEKDAYS[d.getDay()].toUpperCase()}, ${time}`;
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
