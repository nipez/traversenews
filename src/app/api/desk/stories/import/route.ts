import { NextResponse } from "next/server";
import { isDeskRequestAuthed } from "@/lib/auth";
import {
  getAppData,
  replaceStoriesForSources,
} from "@/lib/data/store";
import {
  normalizeImportedStories,
  type StoryImportRow,
} from "@/lib/desk/import-stories";

/**
 * Accept browser-pulled story lists (Facebook alerts: Grand Traverse 911, etc.).
 * Never invents posts — only saves what the client sends.
 *
 * Body: {
 *   stories: [{ title, url, dek?, published_at?, source_id? }],
 *   source_id?, replace?, clear?
 * }
 * Auth: Desk cookie session OR Authorization: Bearer <DESK_IMPORT_TOKEN|DEV_DESK_PASSWORD>
 */
export async function POST(request: Request) {
  if (!(await isDeskRequestAuthed(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    stories?: StoryImportRow[];
    source_id?: string;
    replace?: boolean;
    clear?: boolean;
  } | null;

  if (!body || !Array.isArray(body.stories)) {
    return NextResponse.json(
      {
        error:
          "Body must be { stories: [{ title, url, dek?, published_at?, source_id? }] }",
      },
      { status: 400 },
    );
  }

  const data = await getAppData();
  const defaultSource =
    (typeof body.source_id === "string" && body.source_id.trim()) ||
    "src_gt911";

  const { imported, source_ids, skipped } = normalizeImportedStories(
    body.stories,
    data.sources,
    defaultSource,
  );

  if (imported.length === 0) {
    if (body.stories.length > 0) {
      return NextResponse.json(
        {
          error: "No valid stories to import",
          skipped,
          hint: "Each row needs title + url. Do not invent posts.",
        },
        { status: 400 },
      );
    }
    if (body.replace !== false && body.clear === true) {
      const target =
        (typeof body.source_id === "string" && body.source_id.trim()) ||
        "src_gt911";
      await replaceStoriesForSources([], [target]);
      return NextResponse.json({
        ok: true,
        imported: 0,
        skipped: [],
        source_ids: [target],
        replace: true,
        message: `Cleared stories for ${target}.`,
      });
    }
    return NextResponse.json({
      ok: true,
      imported: 0,
      skipped: [],
      source_ids: [],
      replace: body.replace !== false,
      message: "No stories in payload; nothing changed.",
    });
  }

  const replace = body.replace !== false;
  const targets = source_ids;

  if (replace) {
    await replaceStoriesForSources(imported, targets);
  } else {
    const existing = data.stories.filter((s) => targets.includes(s.source_id));
    await replaceStoriesForSources([...existing, ...imported], targets);
  }

  return NextResponse.json({
    ok: true,
    imported: imported.length,
    skipped,
    source_ids: targets,
    replace,
    message: `Saved ${imported.length} browser-pulled story(ies) to KV.`,
  });
}
