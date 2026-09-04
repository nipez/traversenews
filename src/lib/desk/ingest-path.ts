import {
  isHsAthleticsEventSource,
  isSchoolCalendarSource,
  isShowEventSource,
} from "@/lib/events";
import { EVENTLINK_ATHLETICS_SOURCE_IDS } from "@/lib/pull/html-athletics";
import { hasIcsFeedOverride } from "@/lib/pull/ics";
import type { Source } from "@/lib/types";

/** Civic calendar desks — meetings on /civic via civic/import. */
const CIVIC_CALENDAR_SOURCE_IDS = new Set(["src_gt_cal", "src_civicweb"]);

/**
 * How this Desk source gets live rows into KV.
 * Worker weekday cron pulls RSS/ICS. html / facebook / Simpleview need
 * Traverse News on the box to POST an import route — never invent listings.
 */
export function ingestPathForSource(source: Source): {
  workerPulls: boolean;
  importPath: string | null;
  summary: string;
} {
  if (source.pull_method === "original") {
    return {
      workerPulls: false,
      importPath: null,
      summary: "Staff originals — Desk publish only.",
    };
  }

  if (
    source.pull_method === "html" &&
    (source.id === "src_a2_news" || source.id === "src_theride")
  ) {
    return {
      workerPulls: true,
      importPath: "/api/desk/stories/import",
      summary:
        "Worker reads the newsroom HTML (headline + permalink + printed date). If empty, Traverse News → POST /api/desk/stories/import.",
    };
  }

  if (
    source.pull_method === "rss" ||
    source.pull_method === "ics" ||
    hasIcsFeedOverride(source.id)
  ) {
    return {
      workerPulls: true,
      importPath: null,
      summary: "Worker weekday RSS/ICS pull.",
    };
  }

  if (isHsAthleticsEventSource(source.id)) {
    const workerHtml = EVENTLINK_ATHLETICS_SOURCE_IDS.has(source.id);
    return {
      workerPulls: workerHtml,
      importPath: "/api/desk/athletics/import",
      summary: workerHtml
        ? "Worker reads EventLink /Events tables (printed clock or TBD). If empty, Traverse News → POST /api/desk/athletics/import."
        : "Traverse News pulls on the box → POST /api/desk/athletics/import (Sports, never Events).",
    };
  }

  if (isSchoolCalendarSource(source.id)) {
    return {
      workerPulls: false,
      importPath: "/api/desk/schools/import",
      summary:
        "Traverse News pulls on the box → POST /api/desk/schools/import (/schools).",
    };
  }

  if (isShowEventSource(source.id) || source.beat_id === "beat_shows") {
    const workerHtml = new Set([
      "src_state_theatre",
      "src_elk_cinema",
      "src_alluvion",
    ]).has(source.id);
    return {
      workerPulls: workerHtml,
      importPath: "/api/desk/shows/import",
      summary: workerHtml
        ? "Worker tries HTML showtimes; if bot-blocked or empty, Traverse News → POST /api/desk/shows/import (/shows)."
        : "Traverse News pulls on the box → POST /api/desk/shows/import (/shows, never Events).",
    };
  }

  if (CIVIC_CALENDAR_SOURCE_IDS.has(source.id)) {
    return {
      workerPulls: false,
      importPath: "/api/desk/civic/import",
      summary:
        "Traverse News pulls on the box → POST /api/desk/civic/import (/civic, never Events).",
    };
  }

  if (source.beat_id === "beat_events" || source.beat_id === "beat_arts") {
    const workerHtml = new Set([
      "src_interlochen",
      "src_tadl",
      "src_visit_events",
    ]).has(source.id);
    return {
      workerPulls: workerHtml,
      importPath: "/api/desk/events/import",
      summary: workerHtml
        ? "Worker tries HTML; if bot-blocked or empty, Traverse News pulls on the box → POST /api/desk/events/import (/whats-on)."
        : "Traverse News pulls on the box → POST /api/desk/events/import (/whats-on).",
    };
  }

  if (source.pull_method === "facebook") {
    return {
      workerPulls: false,
      importPath: "/api/desk/stories/import",
      summary:
        "Traverse News pulls on the box → POST /api/desk/stories/import (alerts / wire).",
    };
  }

  if (source.pull_method === "html" || source.pull_method === "none") {
    return {
      workerPulls: false,
      importPath: "/api/desk/stories/import",
      summary:
        "Traverse News pulls on the box → POST /api/desk/stories/import (headline + link).",
    };
  }

  return {
    workerPulls: false,
    importPath: null,
    summary: "No automatic Worker pull — set an import path in notes.",
  };
}

/** Short Desk note when HTML calendars cannot be Worker-scraped. */
export function boxBrowserEventsNote(url: string): string {
  return `No Worker scrape (bot wall / JS / PDF). Traverse News pulls ${url} on the box and POSTs /api/desk/events/import. Never invent listings.`;
}

export function boxBrowserShowsNote(url: string): string {
  return `No Worker scrape (bot wall / JS). Traverse News pulls ${url} on the box and POSTs /api/desk/shows/import. Never invent showtimes.`;
}
