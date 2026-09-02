/**
 * Weather formatter + omit-when-missing.
 * Run: npm run test:weather
 */
import assert from "node:assert/strict";
import {
  formatWeatherLine,
  pickTodaysWeatherFromPeriods,
  shortenWeatherCondition,
} from "../src/lib/weather";

assert.equal(
  formatWeatherLine({ high: 72, low: 55, condition: "rain likely" }),
  "72° / 55° · rain likely",
  "high/low + condition",
);
assert.equal(
  formatWeatherLine({ high: 72.4, low: 54.6, condition: "Sunny" }),
  "72° / 55° · sunny",
  "rounds temps; lowercases condition",
);
assert.equal(
  formatWeatherLine({ high: 68, low: 50, condition: "  " }),
  "68° / 50°",
  "temps only when condition blank",
);
assert.equal(formatWeatherLine(null), null, "omit null");
assert.equal(formatWeatherLine(undefined), null, "omit undefined");
assert.equal(
  formatWeatherLine({ high: 72, condition: "sunny" }),
  null,
  "omit when low missing",
);
assert.equal(
  formatWeatherLine({ low: 55, condition: "sunny" }),
  null,
  "omit when high missing",
);
assert.equal(
  formatWeatherLine({ high: Number.NaN, low: 55, condition: "sunny" }),
  null,
  "omit NaN",
);

assert.equal(
  shortenWeatherCondition("Chance Showers And Thunderstorms"),
  "storms likely",
);
assert.equal(
  shortenWeatherCondition("Slight Chance Rain Showers"),
  "rain possible",
);
assert.equal(shortenWeatherCondition("Mostly Sunny"), "mostly sunny");
assert.equal(shortenWeatherCondition("Patchy Fog"), "fog");
assert.equal(shortenWeatherCondition(""), null);
assert.equal(shortenWeatherCondition(null), null);

const periods = [
  {
    name: "Today",
    startTime: "2026-09-02T07:00:00-04:00",
    isDaytime: true,
    temperature: 79,
    temperatureUnit: "F",
    shortForecast: "Chance Rain Showers",
  },
  {
    name: "Tonight",
    startTime: "2026-09-02T19:00:00-04:00",
    isDaytime: false,
    temperature: 63,
    temperatureUnit: "F",
    shortForecast: "Mostly Cloudy",
  },
  {
    name: "Thursday",
    startTime: "2026-09-03T07:00:00-04:00",
    isDaytime: true,
    temperature: 80,
    temperatureUnit: "F",
    shortForecast: "Sunny",
  },
];

const picked = pickTodaysWeatherFromPeriods(periods, {
  date: "2026-09-02",
  timeZone: "America/Detroit",
});
assert.ok(picked, "picks today");
assert.equal(picked!.high, 79);
assert.equal(picked!.low, 63);
assert.equal(picked!.condition, "rain likely");
assert.equal(
  formatWeatherLine(picked),
  "79° / 63° · rain likely",
);

assert.equal(
  pickTodaysWeatherFromPeriods(periods, {
    date: "2026-09-09",
    timeZone: "America/Detroit",
  }),
  null,
  "omit when no periods for that day",
);

assert.equal(
  pickTodaysWeatherFromPeriods(
    [
      {
        name: "Tonight",
        startTime: "2026-09-02T19:00:00-04:00",
        isDaytime: false,
        temperature: 60,
        temperatureUnit: "F",
        shortForecast: "Clear",
      },
    ],
    { date: "2026-09-02", timeZone: "America/Detroit" },
  ),
  null,
  "omit when high missing (night-only)",
);

console.log("test:weather ok");
