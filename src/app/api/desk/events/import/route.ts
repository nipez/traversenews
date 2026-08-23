import { NextResponse } from "next/server";
import { isDeskRequestAuthed } from "@/lib/auth";
import { getAppData, replacePulledEvents } from "@/lib/data/store";
import {
  normalizeImportedEvents,
  type EventImportRow,
} from "@/lib/desk/import-events";

/**
 * Accept browser-pulled event lists (Visit TC Simpleview first).
 * Cloud agents often get 403 — Traverse News on a live computer POSTs here.
 * Never invents events; only saves what the client sends.
 *
 * Body: { events: [{ title, starts_at, place?, url?, source_id? }], source_id?, replace? }
 * Auth: Desk cookie session OR Authorization: Bearer <DESK_IMPORT_TOKEN|DEV_DESK_PASSWORD>
 */
export async function POST(request: Request) {
  if (!(await isDeskRequestAuthed(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    events?: EventImportRow[];
    source_id?: string;
    replace?: boolean;
    clear?: boolean;
  } | null;

  if (!body || !Array.isArray(body.events)) {
    return NextResponse.json(
      {
        error:
          "Body must be { events: [{ title, starts_at, place?, url?, source_id? }] }",
      },
      { status: 400 },
    );
  }

  const data = await getAppData();
  const defaultSource =
    (typeof body.source_id === "string" && body.source_id.trim()) ||
    "src_visit_events";

  const { imported, source_ids, skipped } = normalizeImportedEvents(
    body.events,
    data.sources,
    defaultSource,
  );

  if (imported.length === 0) {
    if (body.events.length > 0) {
      return NextResponse.json(
        {
          error: "No valid events to import",
          skipped,
          hint: "Each row needs title + ISO starts_at. Do not invent listings.",
        },
        { status: 400 },
      );
    }
    // Explicit clear only — never wipe on accidental empty POST.
    if (body.replace !== false && body.clear === true) {
      const target =
        (typeof body.source_id === "string" && body.source_id.trim()) ||
        "src_visit_events";
      await replacePulledEvents([], [target]);
      return NextResponse.json({
        ok: true,
        imported: 0,
        skipped: [],
        source_ids: [target],
        replace: true,
        message: `Cleared events for ${target}.`,
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
    await replacePulledEvents(imported, targets);
  } else {
    // Merge: keep existing rows for these sources, then dedupe with incoming.
    await replacePulledEvents(
      [
        ...data.events.filter((e) => targets.includes(e.source_id)),
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
    message: `Saved ${imported.length} browser-pulled event(s) to KV.`,
  });
}
