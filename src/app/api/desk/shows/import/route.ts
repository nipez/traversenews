import { NextResponse } from "next/server";
import { isDeskRequestAuthed } from "@/lib/auth";
import { getAppData, replaceShowListings } from "@/lib/data/store";
import {
  normalizeImportedShows,
  SHOW_SOURCE_IDS,
  type ShowImportRow,
} from "@/lib/shows";

/**
 * Accept browser-pulled movie / theatre listings.
 * Stored on AppData.shows — NEVER written into events / What's on.
 *
 * Body: {
 *   shows: [{ title, starts_at, ends_at?, times?, venue?, url?, source_id }],
 *   replace?: true, clear?: true, source_id?
 * }
 * Naive starts_at = America/Detroit. Soft cap ~80. Never invents showtimes.
 * Group by title — do not dump a 14-screen AMC grid as separate rows.
 * Auth: Desk cookie OR Authorization: Bearer desk
 */
export async function POST(request: Request) {
  if (!(await isDeskRequestAuthed(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    shows?: ShowImportRow[];
    listings?: ShowImportRow[];
    source_id?: string;
    replace?: boolean;
    clear?: boolean;
  } | null;

  const rows = Array.isArray(body?.shows)
    ? body!.shows
    : Array.isArray(body?.listings)
      ? body!.listings
      : null;

  if (!body || rows == null) {
    return NextResponse.json(
      {
        error:
          "Body must be { shows: [{ title, starts_at, times?, venue?, url?, source_id }] }",
      },
      { status: 400 },
    );
  }

  const data = await getAppData();
  const defaultSource =
    (typeof body.source_id === "string" && body.source_id.trim()) ||
    "src_amc_cherry";

  const { imported, source_ids, skipped } = normalizeImportedShows(
    rows,
    data.sources,
    defaultSource,
  );

  if (imported.length === 0) {
    if (rows.length > 0) {
      return NextResponse.json(
        {
          error: "No valid show listings to import",
          skipped,
          hint: "Each row needs title, starts_at, and a Shows source_id. Do not invent showtimes.",
        },
        { status: 400 },
      );
    }
    if (body.replace !== false && body.clear === true) {
      const target =
        (typeof body.source_id === "string" && body.source_id.trim()) || "";
      const targets = target ? [target] : [...SHOW_SOURCE_IDS];
      await replaceShowListings([], targets);
      return NextResponse.json({
        ok: true,
        imported: 0,
        skipped: [],
        source_ids: targets,
        replace: true,
        message: `Cleared shows for ${targets.join(", ")}.`,
      });
    }
    return NextResponse.json({
      ok: true,
      imported: 0,
      skipped: [],
      source_ids: [],
      replace: body.replace !== false,
      message: "No shows in payload; nothing changed.",
    });
  }

  const replace = body.replace !== false;
  const targets = source_ids;

  if (replace) {
    await replaceShowListings(imported, targets);
  } else {
    await replaceShowListings(
      [
        ...(data.shows ?? []).filter((s) => targets.includes(s.source_id)),
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
    message: `Saved ${imported.length} show listing(s) to AppData.shows (not events).`,
  });
}
