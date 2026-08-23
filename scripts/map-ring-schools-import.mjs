/**
 * Build + POST official 2026–27 Important dates for bay-ring districts.
 * Dates come only from the dated lists in the task — never invent times/noon.
 *
 * Usage:
 *   node scripts/map-ring-schools-import.mjs            # write JSON + validate
 *   node scripts/map-ring-schools-import.mjs --post      # POST to live Worker
 *   node scripts/map-ring-schools-import.mjs --post --base=https://…
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "map-ring-schools-import.json");

const IMPORTANT_MARKERS = [
  "half day",
  "half-day",
  "halfday",
  "early release",
  "no school",
  "no-school",
  "noschool",
  "school closed",
  "schools closed",
  "closed for",
  "students off",
  "spring break",
  "winter break",
  "holiday break",
  "christmas break",
  "thanksgiving break",
  "winter recess",
  "spring recess",
  "thanksgiving recess",
  "labor day recess",
  "mid-winter",
  "midwinter",
  "midwinter break",
  "recess",
  "conference",
  "conferences",
  "parent-teacher",
  "parent teacher",
  "parent/teacher",
  "orientation",
  "open house",
  "meet the teacher",
  "records day",
  "record day",
  "teacher work",
  "professional development",
  "pd day",
  "staff pd",
  "region pd",
  "rsdd",
  "in-service",
  "inservice",
  "first day",
  "last day",
  "1st student day",
  "first student day",
  "school resumes",
  "graduation",
  "commencement",
  "exam day",
  "exams",
  "finals",
  "semester",
  "count day",
  "mlk",
  "m.l. king",
  "martin luther king",
  "memorial day",
  "labor day",
  "presidents",
  "president's day",
  "presidents' day",
  "trout friday",
  "good friday",
  "holiday",
];

const NOISE = [
  "pta",
  "p.t.a",
  "pfo",
  "booster",
  "athletic",
  "athletics",
  "varsity",
  "jv ",
  "football",
  "soccer",
  "basketball",
  "volleyball",
  "baseball",
  "softball",
  "wrestling",
  "track meet",
  "cross country",
  "swim meet",
  "game vs",
  "vs.",
  "open house social",
  "book fair",
  "spirit night",
  "bingo",
  "fundraiser",
  "carnival",
  "movie night",
  "family fun",
];

function isImportant(title) {
  const t = title.toLowerCase().replace(/\s+/g, " ").trim();
  if (!t) return false;
  if (NOISE.some((m) => t.includes(m))) {
    const closure =
      t.includes("no school") ||
      t.includes("school closed") ||
      t.includes("half day") ||
      t.includes("break");
    if (!closure) return false;
  }
  if (IMPORTANT_MARKERS.some((m) => t.includes(m))) return true;
  if (
    /\b(first|last)\s+day\b/.test(t) &&
    /\b(school|class|classes|students)\b/.test(t)
  ) {
    return true;
  }
  return false;
}

function parseYmd(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return { y, m, d };
}

function ymdFromParts(y, m, d) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function addDays(ymd, n) {
  const { y, m, d } = parseYmd(ymd);
  const utc = new Date(Date.UTC(y, m - 1, d + n));
  return ymdFromParts(
    utc.getUTCFullYear(),
    utc.getUTCMonth() + 1,
    utc.getUTCDate(),
  );
}

function eachDay(start, end) {
  const out = [];
  let cur = start;
  while (cur <= end) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

/**
 * Compact row: { date } | { from, to } + title + optional time "HH:MM"
 */
function expand(rows, source_id, district) {
  const events = [];
  for (const row of rows) {
    const days = row.from
      ? eachDay(row.from, row.to)
      : [row.date];
    for (const day of days) {
      const starts_at = row.time ? `${day}T${row.time}` : day;
      events.push({
        title: row.title,
        starts_at,
        source_id,
        district,
      });
    }
  }
  return events;
}

const packs = [
  {
    source_id: "src_glenlake_cal",
    district: "Glen Lake",
    rows: [
      {
        date: "2026-08-26",
        title: "Teacher Work Day / Open House",
        time: "18:00",
      },
      {
        date: "2026-08-31",
        title: "First day (students half day) — 11:30 AM dismissal",
        time: "11:30",
      },
      { date: "2026-09-04", title: "No school" },
      { date: "2026-09-07", title: "Labor Day — no school" },
      {
        date: "2026-10-14",
        title: "P/T conferences",
        time: "17:00",
      },
      {
        date: "2026-10-15",
        title:
          "Half day students; P/T conferences — 12:30-3:30 & 5-8 (11:30 AM dismissal)",
        time: "11:30",
      },
      { date: "2026-10-16", title: "No school" },
      { date: "2026-11-02", title: "Students off / staff PD" },
      { date: "2026-11-25", title: "Half day students and staff" },
      {
        from: "2026-11-26",
        to: "2026-11-27",
        title: "Thanksgiving break — no school",
      },
      {
        from: "2026-12-21",
        to: "2026-12-31",
        title: "Winter recess — no school",
      },
      { date: "2027-01-01", title: "Winter recess — no school" },
      { date: "2027-01-18", title: "MLK Day — no school" },
      {
        from: "2027-01-21",
        to: "2027-01-22",
        title: "Half day students / full day staff",
      },
      {
        date: "2027-02-11",
        title: "P/T conferences",
        time: "17:00",
      },
      { date: "2027-02-12", title: "Half day students and staff" },
      { date: "2027-02-15", title: "Presidents' Day — no school" },
      {
        from: "2027-03-26",
        to: "2027-03-31",
        title: "Spring break — no school",
      },
      {
        from: "2027-04-01",
        to: "2027-04-02",
        title: "Spring break — no school",
      },
      {
        date: "2027-04-16",
        title: "Half day students / full day staff",
      },
      { date: "2027-05-31", title: "Memorial Day — no school" },
      {
        date: "2027-06-11",
        title: "Last day students (half day) — 11:30 am dismissal",
        time: "11:30",
      },
    ],
  },
  {
    source_id: "src_northport_cal",
    district: "Northport",
    rows: [
      { date: "2026-09-01", title: "No school — PD #1" },
      { date: "2026-09-02", title: "No school — PD #2" },
      { date: "2026-09-07", title: "Labor Day — no school" },
      { date: "2026-09-08", title: "First day of school" },
      { date: "2026-10-28", title: "Evening conferences" },
      {
        date: "2026-10-29",
        title: "Half day students / half day conferences",
      },
      { date: "2026-10-30", title: "No school everyone" },
      { date: "2026-11-02", title: "No school — Region PD" },
      { date: "2026-11-25", title: "Half day everyone" },
      { date: "2026-11-26", title: "Thanksgiving — no school" },
      { date: "2026-11-27", title: "No school everyone" },
      {
        from: "2026-12-19",
        to: "2027-01-03",
        title: "Winter break — no school",
      },
      { date: "2027-01-04", title: "School resumes" },
      { date: "2027-01-18", title: "M.L. King Day — no school" },
      { from: "2027-01-20", to: "2027-01-21", title: "Exams" },
      {
        date: "2027-01-22",
        title:
          "Exams — half day students / half day records; semester ends",
      },
      {
        date: "2027-02-18",
        title: "Half day students / half day conferences",
      },
      { date: "2027-02-19", title: "No school everyone" },
      { date: "2027-02-22", title: "No school — PD #4" },
      {
        date: "2027-03-16",
        title: "Half day students / half day PD",
      },
      {
        from: "2027-03-26",
        to: "2027-04-04",
        title: "Spring break — no school",
      },
      { date: "2027-04-05", title: "School resumes" },
      {
        date: "2027-04-20",
        title: "Half day students / half day PD",
      },
      {
        date: "2027-05-31",
        title: "Memorial Day — no school everyone",
      },
      { date: "2027-06-09", title: "Exams" },
      {
        from: "2027-06-10",
        to: "2027-06-11",
        title: "Half day student exams / half day records",
      },
      { date: "2027-06-11", title: "Last day of school" },
    ],
  },
  {
    source_id: "src_benzie_cal",
    district: "Benzie Central",
    rows: [
      { date: "2026-08-31", title: "First day students" },
      { date: "2026-09-04", title: "No school" },
      { date: "2026-09-07", title: "Labor Day — no school" },
      { date: "2026-09-11", title: "Half day PD" },
      { date: "2026-09-25", title: "Half day PD" },
      {
        from: "2026-10-08",
        to: "2026-10-09",
        title: "P/T conferences; half days",
      },
      { date: "2026-11-02", title: "RSDD — no school students" },
      {
        from: "2026-11-25",
        to: "2026-11-27",
        title: "Thanksgiving break — no school",
      },
      { date: "2026-12-04", title: "Half day PD" },
      {
        from: "2026-12-21",
        to: "2027-01-01",
        title: "Holiday break — no school",
      },
      { date: "2027-01-04", title: "School resumes" },
      { date: "2027-01-22", title: "Half day records" },
      { date: "2027-02-12", title: "Half day PD" },
      { date: "2027-02-15", title: "No school" },
      {
        from: "2027-03-11",
        to: "2027-03-12",
        title: "P/T conferences; half days",
      },
      {
        from: "2027-03-26",
        to: "2027-04-02",
        title: "Spring break — no school",
      },
      { date: "2027-04-05", title: "School resumes" },
      { date: "2027-04-23", title: "Half day PD" },
      { date: "2027-05-28", title: "Half day PD" },
      { date: "2027-05-31", title: "Memorial Day — no school" },
      {
        date: "2027-06-09",
        title: "Last day (tentative); half day records",
      },
    ],
  },
  {
    source_id: "src_frankfort_cal",
    district: "Frankfort-Elberta",
    rows: [
      { date: "2026-09-08", title: "1st student day" },
      { date: "2026-09-30", title: "Early release" },
      {
        from: "2026-10-14",
        to: "2026-10-15",
        title: "PT conferences",
      },
      { date: "2026-11-02", title: "RSDD — no school" },
      { date: "2026-11-18", title: "Early release" },
      {
        from: "2026-11-26",
        to: "2026-11-27",
        title: "Thanksgiving — no school",
      },
      { date: "2026-12-09", title: "Early release" },
      {
        from: "2026-12-21",
        to: "2027-01-01",
        title: "Winter break — no school",
      },
      { date: "2027-01-04", title: "School resumes" },
      { date: "2027-01-22", title: "End of 1st semester" },
      { date: "2027-01-27", title: "Early release" },
      { date: "2027-02-12", title: "Winter break — no school" },
      { date: "2027-02-15", title: "Winter break — no school" },
      { date: "2027-03-11", title: "PT conferences" },
      { date: "2027-03-17", title: "Early release" },
      {
        from: "2027-03-26",
        to: "2027-04-02",
        title: "Spring break — no school",
      },
      { date: "2027-04-05", title: "School resumes" },
      { date: "2027-04-21", title: "Early release" },
      { date: "2027-05-19", title: "Early release" },
      { date: "2027-05-31", title: "Memorial Day — no school" },
      { date: "2027-06-16", title: "Tentative last day" },
    ],
  },
  {
    source_id: "src_kalkaska_cal",
    district: "Kalkaska",
    rows: [
      { date: "2026-08-25", title: "First day for students" },
      { date: "2026-09-04", title: "No school" },
      { date: "2026-09-07", title: "No school — Labor Day" },
      { date: "2026-09-25", title: "No school — staff PD" },
      {
        date: "2026-10-22",
        title:
          "Half day students; K–5 conferences (afternoon and evening)",
      },
      { date: "2026-10-23", title: "No school" },
      {
        date: "2026-11-02",
        title: "No school — teacher work day / RSDD",
      },
      {
        date: "2026-11-03",
        title: "Evening conferences — secondary 6-12",
      },
      {
        date: "2026-11-05",
        title: "Evening conferences — secondary 6-12",
      },
      {
        from: "2026-11-25",
        to: "2026-11-29",
        title: "Thanksgiving break — no school",
      },
      { date: "2027-11-30", title: "School resumes" },
      // Fix: Nov 30 2026
    ],
  },
  {
    source_id: "src_forest_cal",
    district: "Forest Area",
    rows: [
      {
        date: "2026-08-31",
        title: "Half day — first day of school",
      },
      { date: "2026-09-04", title: "No staff or students — no school" },
      { date: "2026-09-07", title: "No staff or students — no school" },
      { date: "2026-09-30", title: "Half day — staff PD" },
      {
        from: "2026-10-15",
        to: "2026-10-16",
        title: "Half day — conferences",
      },
      { date: "2026-11-02", title: "RSDD — no students" },
      {
        from: "2026-11-25",
        to: "2026-11-27",
        title: "Thanksgiving — no school",
      },
      {
        from: "2026-12-21",
        to: "2027-01-01",
        title: "Winter break — no school",
      },
      { date: "2027-01-04", title: "School resumes" },
      {
        from: "2027-01-21",
        to: "2027-01-22",
        title: "Half days — end of 1st semester",
      },
      { date: "2027-02-03", title: "Half day — staff PD" },
      { date: "2027-02-12", title: "Midwinter break — no school" },
      { date: "2027-02-15", title: "Staff PD day — no school" },
      {
        from: "2027-03-10",
        to: "2027-03-11",
        title: "Full day (conferences after hours)",
      },
      {
        from: "2027-03-26",
        to: "2027-04-05",
        title: "Spring break — no school",
      },
      { date: "2027-04-23", title: "Half day — Trout Friday" },
      { date: "2027-05-05", title: "Half day — staff PD" },
      {
        date: "2027-05-24",
        title: "Memorial Day - No School",
      },
      {
        from: "2027-06-08",
        to: "2027-06-09",
        title: "Half day — end of 2nd semester",
      },
    ],
  },
  {
    source_id: "src_mancelona_cal",
    district: "Mancelona",
    rows: [
      { date: "2026-08-27", title: "PD / Meet the Teacher" },
      {
        date: "2026-09-01",
        title: "Full day of school (first student day)",
      },
      { date: "2026-09-04", title: "No school (Labor Day recess)" },
      { date: "2026-09-07", title: "No school (Labor Day recess)" },
      { date: "2026-09-08", title: "School resumes" },
      {
        date: "2026-11-05",
        title: "Half day students; parent teacher conferences",
      },
      { date: "2026-11-06", title: "PD (no students) — no school" },
      {
        from: "2026-11-25",
        to: "2026-11-27",
        title: "Thanksgiving recess — no school",
      },
      { date: "2026-11-30", title: "School resumes" },
      {
        date: "2026-12-22",
        title: "Full day; winter recess end of day",
      },
      { date: "2027-01-04", title: "School resumes" },
      {
        date: "2027-02-15",
        title: "No school (mid-winter recess)",
      },
      {
        date: "2027-03-04",
        title: "Half day students; parent teacher conferences",
      },
      { date: "2027-03-05", title: "PD (no students) — no school" },
      {
        date: "2027-03-25",
        title: "Full day; spring recess end of day",
      },
      { date: "2027-04-05", title: "School resumes" },
      {
        date: "2027-05-31",
        title: "No school (Memorial Day recess)",
      },
      { date: "2027-06-10", title: "Last day (full day)" },
    ],
  },
  {
    source_id: "src_buckley_cal",
    district: "Buckley",
    rows: [
      { date: "2026-08-25", title: "Kindergarten Open House" },
      { date: "2026-08-26", title: "1-12 Open House" },
      {
        date: "2026-08-31",
        title: "First day half day / staff PD",
        time: "11:35",
      },
      { date: "2026-09-04", title: "No school" },
      { date: "2026-09-07", title: "Labor Day — no school" },
      { date: "2026-11-02", title: "No school / staff PD" },
      {
        from: "2026-11-11",
        to: "2026-11-12",
        title: "Parent/Teacher Conference",
      },
      { date: "2026-11-13", title: "No school" },
      {
        from: "2026-11-26",
        to: "2026-11-27",
        title: "Thanksgiving — no school",
      },
      {
        from: "2026-12-21",
        to: "2026-12-31",
        title: "Winter break — no school",
      },
      { date: "2027-01-04", title: "School resumes" },
      {
        date: "2027-01-22",
        title: "Half day / teacher work day",
        time: "11:35",
      },
      { date: "2027-02-15", title: "No school / staff PD" },
      {
        date: "2027-02-25",
        title: "PT conferences as needed",
      },
      {
        from: "2027-03-26",
        to: "2027-03-31",
        title: "Spring break — no school",
      },
      {
        from: "2027-04-01",
        to: "2027-04-02",
        title: "Spring break — no school",
      },
      { date: "2027-04-05", title: "School resumes" },
      { date: "2027-05-31", title: "Memorial Day — no school" },
      {
        date: "2027-06-10",
        title: "Last day half day",
        time: "11:35",
      },
    ],
  },
  {
    source_id: "src_centrallake_cal",
    district: "Central Lake",
    rows: [
      {
        date: "2026-08-26",
        title: "First day of school; early release",
      },
    ],
  },
];

// Fix Kalkaska pack fully (was truncated mid-edit above)
const kalkaska = packs.find((p) => p.source_id === "src_kalkaska_cal");
kalkaska.rows = [
  { date: "2026-08-25", title: "First day for students" },
  { date: "2026-09-04", title: "No school" },
  { date: "2026-09-07", title: "No school — Labor Day" },
  { date: "2026-09-25", title: "No school — staff PD" },
  {
    date: "2026-10-22",
    title: "Half day students; K–5 conferences (afternoon and evening)",
  },
  { date: "2026-10-23", title: "No school" },
  {
    date: "2026-11-02",
    title: "No school — teacher work day / RSDD",
  },
  {
    date: "2026-11-03",
    title: "Evening conferences — secondary 6-12",
  },
  {
    date: "2026-11-05",
    title: "Evening conferences — secondary 6-12",
  },
  { date: "2026-11-25", title: "Thanksgiving break begins — no school" },
  {
    from: "2026-11-26",
    to: "2026-11-29",
    title: "Thanksgiving break — no school",
  },
  { date: "2026-11-30", title: "School resumes" },
  { date: "2026-12-21", title: "Winter break begins — no school" },
  {
    from: "2026-12-22",
    to: "2027-01-03",
    title: "Winter break — no school",
  },
  { date: "2027-01-04", title: "School resumes" },
  { date: "2027-01-18", title: "No school — staff PD" },
  { date: "2027-01-21", title: "Exams — half day" },
  {
    date: "2027-01-22",
    title: "Exams — half day; end of first semester",
  },
  { date: "2027-02-12", title: "No school — staff PD" },
  { date: "2027-02-15", title: "No school" },
  { date: "2027-03-24", title: "Evening conferences; K-5" },
  { date: "2027-03-26", title: "Spring break begins — no school" },
  {
    from: "2027-03-27",
    to: "2027-04-05",
    title: "Spring break — no school",
  },
  { date: "2027-04-06", title: "School resumes" },
  { date: "2027-04-23", title: "No school — Trout Friday" },
  { date: "2027-04-26", title: "No school — staff PD" },
  { date: "2027-05-28", title: "No school" },
  { date: "2027-05-31", title: "No school — Memorial Day" },
  { date: "2027-06-01", title: "School resumes" },
  { date: "2027-06-08", title: "Half day" },
  { date: "2027-06-09", title: "Half day; last day of school" },
];

// Northport Jun 11 appears twice (half day exams range + last day) — keep both titles.
// Deduplicate identical title+day later if needed; last day on Jun 11 is intentional second row.
// Expand will create two rows for Jun 11 from the range and the last-day row — good.

const payloads = packs.map((pack) => {
  const events = expand(pack.rows, pack.source_id, pack.district);
  // Drop exact duplicate title+starts_at
  const seen = new Set();
  const unique = [];
  for (const e of events) {
    const k = `${e.title}|${e.starts_at}`;
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(e);
  }
  return {
    source_id: pack.source_id,
    district: pack.district,
    replace: true,
    events: unique,
  };
});

let bad = 0;
for (const p of payloads) {
  for (const e of p.events) {
    if (!isImportant(e.title)) {
      console.error("FAIL important filter:", p.district, e.title);
      bad++;
    }
  }
}
if (bad) process.exit(1);

const total = payloads.reduce((n, p) => n + p.events.length, 0);
console.log(
  payloads
    .map((p) => `${p.district}: ${p.events.length}`)
    .join("\n"),
);
console.log("total rows:", total);

writeFileSync(OUT, JSON.stringify(payloads, null, 2));
console.log("wrote", OUT);

const args = process.argv.slice(2);
if (!args.includes("--post")) process.exit(0);

const baseArg = args.find((a) => a.startsWith("--base="));
const base = (
  baseArg?.slice("--base=".length) ||
  process.env.SCHOOLS_IMPORT_BASE ||
  "https://traverse-news.nickperez.workers.dev"
).replace(/\/$/, "");
const token = process.env.DESK_IMPORT_TOKEN || process.env.DEV_DESK_PASSWORD || "desk";

for (const body of payloads) {
  const res = await fetch(`${base}/api/desk/schools/import`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  console.log(body.district, res.status, JSON.stringify(json).slice(0, 400));
  if (!res.ok) process.exit(1);
}
