import { NextResponse } from "next/server";
import { isDeskAuthed } from "@/lib/auth";
import { getSource, upsertSource } from "@/lib/data/store";
import type { PullMethod, Source } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  if (!(await isDeskAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const source = await getSource(id);
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ source });
}

export async function PUT(request: Request, ctx: Ctx) {
  if (!(await isDeskAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const existing = await getSource(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = (await request.json()) as Partial<Source>;
  const source: Source = {
    ...existing,
    name: body.name?.trim() || existing.name,
    homepage: body.homepage?.trim() || existing.homepage,
    feed_url:
      body.feed_url === undefined
        ? existing.feed_url
        : body.feed_url?.trim() || null,
    pull_method: (body.pull_method as PullMethod) || existing.pull_method,
    beat_id: body.beat_id || existing.beat_id,
    enabled: body.enabled ?? existing.enabled,
    notes: body.notes ?? existing.notes,
  };
  await upsertSource(source);
  return NextResponse.json({ source });
}
