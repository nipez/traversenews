import { NextResponse } from "next/server";
import { isAlertSourceId } from "@/lib/alerts";
import { isDeskRequestAuthed } from "@/lib/auth";
import {
  getAppData,
  replaceStoriesForSources,
} from "@/lib/data/store";
import {
  normalizeImportedStories,
  type StoryImportRow,
} from "@/lib/desk/import-stories";

function normalizeAlertUrl(url: string): string {
  return url.trim().replace(/\/+$/, "").toLowerCase();
}

/**
 * Accept browser-pulled story lists (Facebook alerts: Grand Traverse 911, etc.).
 * Never invents posts — only saves what the client sends.
 *
 * Body: {
 *   stories: [{ title, url, dek?, published_at?, source_id? }],
 *   source_id?, replace?, clear?, confirm?
 * }
 * Auth: Desk cookie session OR Authorization: Bearer <DESK_IMPORT_TOKEN|DEV_DESK_PASSWORD>
 *
 * Hand-add (replace: false): if an alert URL is already in the strip and confirm
 * is not true, returns 409 with needsConfirm so Desk can Skip or Replace.
 * Bulk pull (replace: true) replaces that source’s rows and skips the gate.
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
    confirm?: boolean;
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
  const confirm = body.confirm === true;

  if (!replace) {
    const incomingUrls = new Set(
      imported.map((s) => normalizeAlertUrl(s.url)).filter(Boolean),
    );
    const existingAlerts = data.stories.filter(
      (s) => !s.is_original && isAlertSourceId(s.source_id),
    );
    const duplicates = existingAlerts.filter((s) =>
      incomingUrls.has(normalizeAlertUrl(s.url)),
    );

    if (duplicates.length > 0 && !confirm) {
      return NextResponse.json(
        {
          error: "URL already in the Alerts strip",
          needsConfirm: true,
          duplicates: duplicates.map((s) => ({
            id: s.id,
            title: s.title,
            url: s.url,
            source_id: s.source_id,
          })),
          message:
            "That URL is already on the Alerts strip. Confirm to replace, or skip.",
        },
        { status: 409 },
      );
    }

    const dropUrls = confirm
      ? new Set(imported.map((s) => normalizeAlertUrl(s.url)))
      : null;
    // On confirm replace, drop the old alert row even if source_id differs.
    const otherAlertSources = confirm
      ? existingAlerts
          .filter((s) => dropUrls?.has(normalizeAlertUrl(s.url)))
          .map((s) => s.source_id)
          .filter((id) => !targets.includes(id))
      : [];
    const mergeTargets = [...new Set([...targets, ...otherAlertSources])];
    const existing = data.stories.filter((s) =>
      mergeTargets.includes(s.source_id),
    );
    const kept = dropUrls
      ? existing.filter((s) => !dropUrls.has(normalizeAlertUrl(s.url)))
      : existing;
    await replaceStoriesForSources([...kept, ...imported], mergeTargets);

    return NextResponse.json({
      ok: true,
      imported: imported.length,
      skipped,
      source_ids: targets,
      replace: false,
      confirmed: confirm && duplicates.length > 0,
      message: `Saved ${imported.length} browser-pulled story(ies) to KV.`,
    });
  }

  await replaceStoriesForSources(imported, targets);

  return NextResponse.json({
    ok: true,
    imported: imported.length,
    skipped,
    source_ids: targets,
    replace: true,
    message: `Saved ${imported.length} browser-pulled story(ies) to KV.`,
  });
}
