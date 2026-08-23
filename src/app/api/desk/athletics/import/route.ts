import { NextResponse } from "next/server";
import { isDeskRequestAuthed } from "@/lib/auth";
import {
  ATHLETICS_SOURCE_IDS,
  normalizeImportedAthletics,
  type AthleticsImportRow,
} from "@/lib/athletics";
import { getAppData, replaceAthleticsGames } from "@/lib/data/store";

/**
 * Accept browser-pulled HS athletics games (greater bay).
 * Stored on AppData.athletics — NEVER written into events.
 *
 * Body: {
 *   games: [{ title, starts_at, place?, url?, source_id, school? }],
 *   replace?: true, clear?: true, source_id?
 * }
 * Naive starts_at = America/Detroit. Soft cap ~80. Never invents games.
 * Auth: Desk cookie OR Authorization: Bearer desk
 */
export async function POST(request: Request) {
  if (!(await isDeskRequestAuthed(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    games?: AthleticsImportRow[];
    events?: AthleticsImportRow[];
    source_id?: string;
    replace?: boolean;
    clear?: boolean;
  } | null;

  const rows = Array.isArray(body?.games)
    ? body!.games
    : Array.isArray(body?.events)
      ? body!.events
      : null;

  if (!body || rows == null) {
    return NextResponse.json(
      {
        error:
          "Body must be { games: [{ title, starts_at, place?, url?, source_id, school? }] }",
      },
      { status: 400 },
    );
  }

  const data = await getAppData();
  const { imported, source_ids, skipped } = normalizeImportedAthletics(
    rows,
    data.sources,
  );

  if (imported.length === 0) {
    if (rows.length > 0) {
      return NextResponse.json(
        {
          error: "No valid athletics games to import",
          skipped,
          hint: "Each row needs title, starts_at, and an HS athletics source_id. Do not invent games.",
        },
        { status: 400 },
      );
    }
    if (body.replace !== false && body.clear === true) {
      const target =
        (typeof body.source_id === "string" && body.source_id.trim()) || "";
      const targets = target ? [target] : [...ATHLETICS_SOURCE_IDS];
      await replaceAthleticsGames([], targets);
      return NextResponse.json({
        ok: true,
        imported: 0,
        skipped: [],
        source_ids: targets,
        replace: true,
        message: `Cleared athletics for ${targets.join(", ")}.`,
      });
    }
    return NextResponse.json({
      ok: true,
      imported: 0,
      skipped: [],
      source_ids: [],
      replace: body.replace !== false,
      message: "No games in payload; nothing changed.",
    });
  }

  const replace = body.replace !== false;
  const targets = source_ids;

  if (replace) {
    await replaceAthleticsGames(imported, targets);
  } else {
    await replaceAthleticsGames(
      [
        ...(data.athletics ?? []).filter((g) => targets.includes(g.source_id)),
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
    message: `Saved ${imported.length} athletics game(s) to AppData.athletics (not events).`,
  });
}
