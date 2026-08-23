import { NextResponse } from "next/server";
import { isDeskRequestAuthed } from "@/lib/auth";
import { getAppData, replaceSchoolCalendarItems } from "@/lib/data/store";
import {
  normalizeImportedSchools,
  SCHOOL_SOURCE_IDS,
  type SchoolImportRow,
} from "@/lib/schools";

/**
 * Accept district academic calendar rows for /schools.
 * Stored on AppData.schools — NEVER written into events.
 *
 * Body: {
 *   events: [{ title, starts_at, place?, url?, source_id?, district? }],
 *   source_id?, replace?: true, clear?: true
 * }
 * Naive starts_at = America/Detroit. Date-only → time_unknown (display —).
 * Soft cap ~500. Never invents half days.
 * Auth: Desk cookie OR Authorization: Bearer desk
 */
export async function POST(request: Request) {
  if (!(await isDeskRequestAuthed(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    events?: SchoolImportRow[];
    games?: SchoolImportRow[];
    source_id?: string;
    replace?: boolean;
    clear?: boolean;
  } | null;

  const rows = Array.isArray(body?.events)
    ? body!.events
    : Array.isArray(body?.games)
      ? body!.games
      : null;

  if (!body || rows == null) {
    return NextResponse.json(
      {
        error:
          "Body must be { events: [{ title, starts_at, place?, url?, source_id?, district? }], source_id?, replace? }",
      },
      { status: 400 },
    );
  }

  const defaultSource =
    (typeof body.source_id === "string" && body.source_id.trim()) || undefined;

  const data = await getAppData();
  const { imported, source_ids, skipped } = normalizeImportedSchools(
    rows,
    data.sources,
    defaultSource,
  );

  if (imported.length === 0) {
    if (rows.length > 0) {
      return NextResponse.json(
        {
          error: "No valid school calendar rows to import",
          skipped,
          hint: "Each row needs title, starts_at, and a district calendar source_id. Do not invent half days.",
        },
        { status: 400 },
      );
    }
    if (body.replace !== false && body.clear === true) {
      const target =
        (typeof body.source_id === "string" && body.source_id.trim()) || "";
      const targets = target ? [target] : [...SCHOOL_SOURCE_IDS];
      await replaceSchoolCalendarItems([], targets);
      return NextResponse.json({
        ok: true,
        imported: 0,
        skipped: [],
        source_ids: targets,
        replace: true,
        message: `Cleared school calendar for ${targets.join(", ")}.`,
      });
    }
    return NextResponse.json({
      ok: true,
      imported: 0,
      skipped: [],
      source_ids: [],
      replace: body.replace !== false,
      message: "No events in payload; nothing changed.",
    });
  }

  const replace = body.replace !== false;
  const targets = source_ids;

  if (replace) {
    await replaceSchoolCalendarItems(imported, targets);
  } else {
    await replaceSchoolCalendarItems(
      [
        ...(data.schools ?? []).filter((g) => targets.includes(g.source_id)),
        ...imported,
      ],
      targets,
    );
  }

  return NextResponse.json({
    ok: true,
    imported: imported.length,
    skipped,
    source_ids: targets,
    replace,
    message: `Saved ${imported.length} school calendar row(s) to AppData.schools (not events).`,
  });
}
