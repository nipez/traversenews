import { NextResponse } from "next/server";
import { isDeskRequestAuthed } from "@/lib/auth";
import { getAppData, replacePulledEvents } from "@/lib/data/store";
import {
  normalizeImportedCivic,
  type CivicImportRow,
} from "@/lib/desk/import-civic";

/**
 * Accept browser-pulled civic meetings (GT County board calendar, etc.).
 * Stores in the shared events KV slice that /civic reads — never invents
 * rows. Public /whats-on excludes these via isCivicEvent / beat_government.
 *
 * Body: {
 *   events: [{ title, starts_at, place?, url?, source_id? }],
 *   source_id?, replace?, clear?
 * }
 * Naive starts_at = America/Detroit wall time.
 * Auth: Desk cookie session OR Authorization: Bearer <DESK_IMPORT_TOKEN|DEV_DESK_PASSWORD>
 */
export async function POST(request: Request) {
  if (!(await isDeskRequestAuthed(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    events?: CivicImportRow[];
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
    "src_gt_cal";

  const { imported, source_ids, skipped } = normalizeImportedCivic(
    body.events,
    data.sources,
    defaultSource,
  );

  if (imported.length === 0) {
    if (body.events.length > 0) {
      return NextResponse.json(
        {
          error: "No valid civic meetings to import",
          skipped,
          hint: "Each row needs title + starts_at. Use a Civic source (src_gt_cal).",
        },
        { status: 400 },
      );
    }
    if (body.replace !== false && body.clear === true) {
      const target =
        (typeof body.source_id === "string" && body.source_id.trim()) ||
        "src_gt_cal";
      await replacePulledEvents([], [target]);
      return NextResponse.json({
        ok: true,
        imported: 0,
        skipped: [],
        source_ids: [target],
        replace: true,
        message: `Cleared civic meetings for ${target}.`,
      });
    }
    return NextResponse.json({
      ok: true,
      imported: 0,
      skipped: [],
      source_ids: [],
      replace: body.replace !== false,
      message: "No meetings in payload; nothing changed.",
    });
  }

  const replace = body.replace !== false;
  const targets = source_ids;

  if (replace) {
    await replacePulledEvents(imported, targets);
  } else {
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
    message: `Saved ${imported.length} civic meeting(s) to KV.`,
  });
}
