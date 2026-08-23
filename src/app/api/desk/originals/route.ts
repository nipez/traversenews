import { NextResponse } from "next/server";
import { isDeskAuthed } from "@/lib/auth";
import {
  getAppData,
  listDrafts,
  upsertDraft,
} from "@/lib/data/store";
import { draftFromPulledCluster } from "@/lib/originals";
import { clusterStories } from "@/lib/pull/cluster";
import type { OriginalDraft } from "@/lib/types";

export async function GET() {
  if (!(await isDeskAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const drafts = await listDrafts();
  return NextResponse.json({ drafts });
}

/** Create a staff draft from a live clustered wire item (title/dek/permalink only). */
export async function POST(request: Request) {
  if (!(await isDeskAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    cluster_id?: string;
    title?: string;
    dek?: string;
    url?: string;
    source_ids?: string[];
  };

  const data = await getAppData();
  const clusters = clusterStories(data.stories, data.sources).filter(
    (c) => !c.is_original,
  );

  let cluster = body.cluster_id
    ? clusters.find((c) => c.id === body.cluster_id)
    : undefined;

  if (!cluster && body.title && body.url) {
    cluster = {
      id: body.cluster_id || `manual_${Date.now()}`,
      title: body.title,
      dek: body.dek ?? "",
      url: body.url,
      published_at: new Date().toISOString(),
      sources: (body.source_ids ?? []).map((id) => ({
        id,
        name: data.sources.find((s) => s.id === id)?.name ?? id,
      })),
      is_original: false,
      byline: null,
      slug: null,
      image_url: null,
      body: null,
    };
  }

  if (!cluster) {
    return NextResponse.json(
      { error: "Pick a live pulled story (cluster_id) or pass title + url" },
      { status: 400 },
    );
  }

  if (!cluster.url?.trim()) {
    return NextResponse.json(
      { error: "Pulled item needs a real article permalink" },
      { status: 400 },
    );
  }

  const draft: OriginalDraft = draftFromPulledCluster({ cluster });
  if (draft.source_urls.length === 0) {
    return NextResponse.json(
      { error: "Source permalink is required" },
      { status: 400 },
    );
  }

  const saved = await upsertDraft(draft);
  return NextResponse.json({ draft: saved });
}
