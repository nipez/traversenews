import { NextResponse } from "next/server";
import { isDeskAuthed } from "@/lib/auth";
import { getAppData, upsertSource } from "@/lib/data/store";
import { newId } from "@/lib/ids";
import type { PullMethod, Source } from "@/lib/types";

export async function GET() {
  if (!(await isDeskAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = await getAppData();
  return NextResponse.json({
    sources: data.sources,
    beats: data.beats,
    last_pull_at: data.last_pull_at,
  });
}

export async function POST(request: Request) {
  if (!(await isDeskAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as Partial<Source>;
  const source: Source = {
    id: newId("src"),
    name: body.name?.trim() || "Untitled source",
    homepage: body.homepage?.trim() || "",
    feed_url: body.feed_url?.trim() || null,
    pull_method: (body.pull_method as PullMethod) || "rss",
    beat_id: body.beat_id || "beat_general",
    enabled: body.enabled ?? true,
    notes: body.notes ?? "",
  };
  await upsertSource(source);
  return NextResponse.json({ source });
}
