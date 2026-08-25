import { NextResponse } from "next/server";
import {
  alertsSameIncident,
  isAlertSourceId,
} from "@/lib/alerts";
import { isDeskRequestAuthed } from "@/lib/auth";
import {
  getAppData,
  replaceStoriesForSources,
} from "@/lib/data/store";
import {
  normalizeImportedStories,
  type StoryImportRow,
} from "@/lib/desk/import-stories";
import type { Story } from "@/lib/types";

function normalizeAlertUrl(url: string): string {
  return url.trim().replace(/\/+$/, "").toLowerCase();
}

function findIncidentDuplicates(
  incoming: Story[],
  existingAlerts: Story[],
): Story[] {
  const hits: Story[] = [];
  const seen = new Set<string>();
  for (const row of incoming) {
    for (const existing of existingAlerts) {
      if (seen.has(existing.id)) continue;
      if (alertsSameIncident(row, existing)) {
        hits.push(existing);
        seen.add(existing.id);
      }
    }
  }
  return hits;
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
 * Hand-add (replace: false): if an alert URL or near-duplicate incident is
 * already in the strip and confirm is not true, returns 409 with needsConfirm
 * so Desk can Skip or Replace.
 * Bulk pull (replace: true) replaces that source’s rows; near-duplicates of
 * other alert sources are skipped so one incident cannot stack three cards.
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
  const existingAlerts = data.stories.filter(
    (s) => !s.is_original && isAlertSourceId(s.source_id),
  );

  if (!replace) {
    const alertTargets = targets.filter((id) => isAlertSourceId(id));
    const incomingUrls = new Set(
      imported.map((s) => normalizeAlertUrl(s.url)).filter(Boolean),
    );
    const urlDuplicates =
      alertTargets.length > 0
        ? existingAlerts.filter((s) =>
            incomingUrls.has(normalizeAlertUrl(s.url)),
          )
        : [];
    const incidentDuplicates =
      alertTargets.length > 0
        ? findIncidentDuplicates(imported, existingAlerts)
        : [];
    // Prefer listing URL hits first, then other same-incident rows.
    const dupById = new Map<string, Story>();
    for (const s of [...urlDuplicates, ...incidentDuplicates]) {
      dupById.set(s.id, s);
    }
    const duplicates = [...dupById.values()];

    if (duplicates.length > 0 && !confirm) {
      const urlHit = urlDuplicates.length > 0;
      return NextResponse.json(
        {
          error: urlHit
            ? "URL already in the Alerts strip"
            : "Similar alert already in the Alerts strip",
          needsConfirm: true,
          reason: urlHit ? "url" : "incident",
          duplicates: duplicates.map((s) => ({
            id: s.id,
            title: s.title,
            url: s.url,
            source_id: s.source_id,
          })),
          message: urlHit
            ? "That URL is already on the Alerts strip. Confirm to replace, or skip."
            : "A similar alert for this incident is already on the strip. Confirm to replace, or skip.",
        },
        { status: 409 },
      );
    }

    const dropIds =
      confirm && alertTargets.length > 0
        ? new Set(duplicates.map((s) => s.id))
        : null;
    const dropUrls =
      confirm && alertTargets.length > 0
        ? new Set(imported.map((s) => normalizeAlertUrl(s.url)))
        : null;
    // On confirm replace, drop the old alert row even if source_id differs.
    const otherAlertSources =
      confirm && (dropIds || dropUrls)
        ? existingAlerts
            .filter(
              (s) =>
                (dropIds?.has(s.id) ?? false) ||
                (dropUrls?.has(normalizeAlertUrl(s.url)) ?? false),
            )
            .map((s) => s.source_id)
            .filter((id) => !targets.includes(id))
        : [];
    const mergeTargets = [...new Set([...targets, ...otherAlertSources])];
    const existing = data.stories.filter((s) =>
      mergeTargets.includes(s.source_id),
    );
    const kept = existing.filter((s) => {
      if (dropIds?.has(s.id)) return false;
      if (dropUrls?.has(normalizeAlertUrl(s.url))) return false;
      return true;
    });
    await replaceStoriesForSources([...kept, ...imported], mergeTargets);

    return NextResponse.json({
      ok: true,
      imported: imported.length,
      skipped,
      source_ids: targets,
      replace: false,
      ...(alertTargets.length > 0
        ? { confirmed: confirm && duplicates.length > 0 }
        : {}),
      message: `Saved ${imported.length} browser-pulled story(ies) to KV.`,
    });
  }

  // Bulk replace: drop incoming rows that near-dupe another alert source's
  // existing card (so GT911 pull doesn't restack a Ticker incident).
  const otherSourceAlerts = existingAlerts.filter(
    (s) => !targets.includes(s.source_id),
  );
  const keptIncoming: Story[] = [];
  const skippedNear: typeof skipped = [...skipped];
  for (const row of imported) {
    if (
      isAlertSourceId(row.source_id) &&
      otherSourceAlerts.some((e) => alertsSameIncident(row, e))
    ) {
      skippedNear.push({
        index: -1,
        reason: `Skipped near-duplicate of existing alert: ${row.title}`,
      });
      continue;
    }
    keptIncoming.push(row);
  }

  await replaceStoriesForSources(keptIncoming, targets);

  return NextResponse.json({
    ok: true,
    imported: keptIncoming.length,
    skipped: skippedNear,
    source_ids: targets,
    replace: true,
    message: `Saved ${keptIncoming.length} browser-pulled story(ies) to KV.`,
  });
}
