/**
 * Today’s city weather snapshot — NWS forecast high/low + short condition.
 *
 * Public GETs read a warm KV key only. NWS is fetched on pull / letter
 * capture, never on every homepage hit. A miss omits the line.
 */

import { detroitDayKey } from "@/lib/dates";
import { getTraverseDataKv } from "@/lib/data/kv";
import { getSite, getSiteId } from "@/lib/sites";
import type { SiteWeatherPoint } from "@/lib/sites/types";

export const WEATHER_PUBLIC_KEY = "public:weather:v1";

/** TTL hint for KV (hours). Pull refreshes sooner; this is a safety net. */
const WEATHER_KV_TTL_SECONDS = 6 * 60 * 60;

export type WeatherSnapshot = {
  v: 1;
  /** America/Detroit calendar date YYYY-MM-DD. */
  date: string;
  high: number;
  low: number;
  /** Short lowercase condition, e.g. "rain likely". */
  condition: string;
  /** One-glance line: "72° / 55° · rain likely". */
  line: string;
  captured_at: string;
  /** Quiet credit, e.g. "NWS". */
  source: "NWS";
  grid: string;
};

export type WeatherParts = {
  high: number;
  low: number;
  condition: string;
};

type NwsPeriod = {
  name?: string;
  startTime?: string;
  isDaytime?: boolean;
  temperature?: number;
  temperatureUnit?: string;
  shortForecast?: string;
};

/** Format the public one-liner. Returns null when high/low are incomplete. */
export function formatWeatherLine(
  parts: Partial<WeatherParts> | null | undefined,
): string | null {
  if (!parts) return null;
  const high = parts.high;
  const low = parts.low;
  if (
    typeof high !== "number" ||
    typeof low !== "number" ||
    !Number.isFinite(high) ||
    !Number.isFinite(low)
  ) {
    return null;
  }
  const hi = Math.round(high);
  const lo = Math.round(low);
  const condition = (parts.condition ?? "").trim().toLowerCase();
  if (!condition) return `${hi}° / ${lo}°`;
  return `${hi}° / ${lo}° · ${condition}`;
}

/**
 * Turn an NWS shortForecast into a brief glance phrase.
 * Never invents weather — only shortens the agency string.
 */
export function shortenWeatherCondition(
  shortForecast: string | null | undefined,
): string | null {
  if (!shortForecast) return null;
  let s = shortForecast.trim().toLowerCase().replace(/\s+/g, " ");
  if (!s) return null;

  // Order matters — more specific / "slight" before plain "chance".
  const rules: Array<[RegExp, string]> = [
    [/thunder\s*storm|t-?storms?/, "storms likely"],
    [/showers?\s+and\s+thunderstorms?/, "storms likely"],
    [/slight\s+chance\s+(of\s+)?(rain\s+)?showers?/, "rain possible"],
    [/chance\s+(of\s+)?(rain\s+)?showers?/, "rain likely"],
    [/rain\s+showers?/, "showers"],
    [/slight\s+chance\s+(of\s+)?rain/, "rain possible"],
    [/chance\s+(of\s+)?rain/, "rain likely"],
    [/heavy\s+rain/, "heavy rain"],
    [/\brain\b/, "rain"],
    [/slight\s+chance\s+(of\s+)?snow/, "snow possible"],
    [/chance\s+(of\s+)?snow/, "snow likely"],
    [/snow\s+showers?/, "snow showers"],
    [/\bsnow\b/, "snow"],
    [/wintry\s+mix/, "wintry mix"],
    [/freezing\s+rain/, "freezing rain"],
    [/patchy\s+fog|areas?\s+of\s+fog|\bfog\b/, "fog"],
    [/haze|hazy/, "hazy"],
    [/smoke/, "smoke"],
    [/mostly\s+sunny/, "mostly sunny"],
    [/partly\s+sunny/, "partly sunny"],
    [/\bsunny\b/, "sunny"],
    [/mostly\s+clear/, "mostly clear"],
    [/\bclear\b/, "clear"],
    [/mostly\s+cloudy/, "mostly cloudy"],
    [/partly\s+cloudy/, "partly cloudy"],
    [/\bcloudy\b/, "cloudy"],
    [/overcast/, "overcast"],
    [/windy|breezy/, "windy"],
  ];

  for (const [re, label] of rules) {
    if (re.test(s)) return label;
  }

  // Fallback: first clause, trimmed.
  s = s.split(/ then | and a | with /)[0]?.trim() ?? s;
  if (s.length > 22) s = `${s.slice(0, 20).trim()}…`;
  return s || null;
}

function toFahrenheit(temp: number, unit?: string): number {
  if ((unit ?? "F").toUpperCase().startsWith("C")) {
    return (temp * 9) / 5 + 32;
  }
  return temp;
}

function periodDayKey(period: NwsPeriod, timeZone: string): string | null {
  if (!period.startTime) return null;
  const d = new Date(period.startTime);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-CA", { timeZone });
}

/**
 * Pick today’s daytime high + overnight low + a short condition from NWS
 * 12-hour forecast periods. Returns null when the day slice is incomplete.
 */
export function pickTodaysWeatherFromPeriods(
  periods: NwsPeriod[],
  opts: { date: string; timeZone?: string } ,
): WeatherParts | null {
  const timeZone = opts.timeZone ?? "America/Detroit";
  const today = opts.date;
  const dayPeriods = periods.filter((p) => periodDayKey(p, timeZone) === today);
  if (dayPeriods.length === 0) return null;

  let high: number | null = null;
  let low: number | null = null;
  let conditionRaw: string | null = null;

  for (const p of dayPeriods) {
    if (typeof p.temperature !== "number" || !Number.isFinite(p.temperature)) {
      continue;
    }
    const temp = Math.round(toFahrenheit(p.temperature, p.temperatureUnit));
    if (p.isDaytime) {
      high = high === null ? temp : Math.max(high, temp);
      if (!conditionRaw && p.shortForecast) conditionRaw = p.shortForecast;
    } else {
      low = low === null ? temp : Math.min(low, temp);
      if (!conditionRaw && p.shortForecast) conditionRaw = p.shortForecast;
    }
  }

  // Overnight low may live on the next calendar day’s first nighttime
  // period when NWS names it after midnight — also accept "Tonight" on today.
  if (low === null) {
    for (const p of periods) {
      if (p.isDaytime) continue;
      const name = (p.name ?? "").toLowerCase();
      if (!name.includes("tonight") && !name.includes("overnight")) continue;
      if (typeof p.temperature !== "number") continue;
      low = Math.round(toFahrenheit(p.temperature, p.temperatureUnit));
      break;
    }
  }

  if (high === null || low === null) return null;
  const condition = shortenWeatherCondition(conditionRaw);
  if (!condition) return null;
  return { high, low, condition };
}

function forecastUrl(point: SiteWeatherPoint): string {
  return `https://api.weather.gov/gridpoints/${point.gridId}/${point.gridX},${point.gridY}/forecast`;
}

async function fetchNwsPeriods(
  point: SiteWeatherPoint,
  userAgent: string,
): Promise<NwsPeriod[]> {
  const res = await fetch(forecastUrl(point), {
    headers: {
      Accept: "application/geo+json",
      "User-Agent": userAgent,
    },
    // Pull path — always want a fresh agency read when refreshing.
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`NWS forecast HTTP ${res.status}`);
  }
  const json = (await res.json()) as {
    properties?: { periods?: NwsPeriod[] };
  };
  const periods = json.properties?.periods;
  if (!Array.isArray(periods) || periods.length === 0) {
    throw new Error("NWS forecast missing periods");
  }
  return periods;
}

function buildSnapshot(
  parts: WeatherParts,
  opts: { date: string; grid: string; at?: Date },
): WeatherSnapshot {
  const line = formatWeatherLine(parts);
  if (!line) {
    throw new Error("weather line incomplete");
  }
  return {
    v: 1,
    date: opts.date,
    high: Math.round(parts.high),
    low: Math.round(parts.low),
    condition: parts.condition,
    line,
    captured_at: (opts.at ?? new Date()).toISOString(),
    source: "NWS",
    grid: opts.grid,
  };
}

/** In-isolate cache so homepage + letter share one KV get. */
let memWeather: WeatherSnapshot | null | undefined;

export function clearWeatherMemCache(): void {
  memWeather = undefined;
}

async function readWeatherKv(): Promise<WeatherSnapshot | null> {
  const kv = await getTraverseDataKv();
  if (!kv) return null;
  try {
    const raw = await kv.get(WEATHER_PUBLIC_KEY, "text");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeatherSnapshot;
    if (
      !parsed ||
      parsed.v !== 1 ||
      typeof parsed.date !== "string" ||
      typeof parsed.line !== "string" ||
      typeof parsed.high !== "number" ||
      typeof parsed.low !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function writeWeatherKv(snap: WeatherSnapshot): Promise<void> {
  const kv = await getTraverseDataKv();
  if (!kv) return;
  await kv.put(WEATHER_PUBLIC_KEY, JSON.stringify(snap), {
    expirationTtl: WEATHER_KV_TTL_SECONDS,
  });
}

/**
 * Cheap public read. Returns null when cold, stale day, or corrupt —
 * callers omit the line (never block the page).
 */
export async function getWeatherSnapshot(
  at = new Date(),
): Promise<WeatherSnapshot | null> {
  const today = detroitDayKey(at);
  if (memWeather !== undefined) {
    if (memWeather && memWeather.date === today) return memWeather;
    if (memWeather && memWeather.date !== today) {
      memWeather = null;
      return null;
    }
    return null;
  }

  const cached = await readWeatherKv();
  if (cached && cached.date === today) {
    memWeather = cached;
    return cached;
  }
  memWeather = null;
  return null;
}

/** Today’s one-liner for UI, or null to omit. */
export async function getTodaysWeatherLine(
  at = new Date(),
): Promise<string | null> {
  const snap = await getWeatherSnapshot(at);
  if (snap?.line) return snap.line;
  // Local `next dev` has no KV — warm once per process so the date row
  // is reviewable. Production still omits on a cold public GET.
  if (process.env.NODE_ENV === "development") {
    const fresh = await refreshWeatherSnapshot(at);
    return fresh?.line ?? null;
  }
  return null;
}

/**
 * Fetch NWS + write public:weather. Best-effort — returns null on failure
 * (never throws into pull/homepage).
 */
export async function refreshWeatherSnapshot(
  at = new Date(),
): Promise<WeatherSnapshot | null> {
  const site = getSite();
  const point = site.weather;
  if (!point) {
    memWeather = null;
    return null;
  }

  const date = detroitDayKey(at);
  try {
    const periods = await fetchNwsPeriods(point, site.userAgent);
    const parts = pickTodaysWeatherFromPeriods(periods, {
      date,
      timeZone: site.timezone,
    });
    if (!parts) {
      memWeather = null;
      return null;
    }
    const snap = buildSnapshot(parts, {
      date,
      grid: `${point.gridId}/${point.gridX},${point.gridY}`,
      at,
    });
    memWeather = snap;
    await writeWeatherKv(snap);
    return snap;
  } catch (err) {
    console.log(
      `weather refresh failed site=${getSiteId()} err=${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    // Keep prior warm cache for today if any (bypass mem miss).
    memWeather = undefined;
    const prior = await readWeatherKv();
    if (prior && prior.date === date) {
      memWeather = prior;
      return prior;
    }
    memWeather = null;
    return null;
  }
}

/**
 * Prefer a warm same-day cache; otherwise refresh once.
 * Used at letter freeze / pull — not on public homepage GETs.
 */
export async function getOrRefreshWeatherSnapshot(
  at = new Date(),
): Promise<WeatherSnapshot | null> {
  const warm = await getWeatherSnapshot(at);
  if (warm) return warm;
  return refreshWeatherSnapshot(at);
}
