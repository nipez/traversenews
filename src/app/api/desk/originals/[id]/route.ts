import { NextResponse } from "next/server";
import { isDeskAuthed } from "@/lib/auth";
import {
  deleteDraft,
  getDraft,
  upsertDraft,
} from "@/lib/data/store";
import type { OriginalDraft } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  if (!(await isDeskAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const draft = await getDraft(id);
  if (!draft) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ draft });
}

export async function PUT(request: Request, ctx: Ctx) {
  if (!(await isDeskAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const existing = await getDraft(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as Partial<OriginalDraft>;
  const urls = Array.isArray(body.source_urls)
    ? body.source_urls.map((u) => String(u).trim()).filter(Boolean)
    : existing.source_urls;

  const next: OriginalDraft = {
    ...existing,
    title: body.title ?? existing.title,
    dek: body.dek ?? existing.dek,
    body: body.body ?? existing.body,
    section: body.section !== undefined ? body.section : existing.section,
    byline: body.byline ?? existing.byline,
    slug: body.slug !== undefined ? body.slug : existing.slug,
    source_urls: urls,
    // status changes only via publish/unpublish
    status: existing.status,
  };

  const saved = await upsertDraft(next);
  return NextResponse.json({ draft: saved });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  if (!(await isDeskAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const ok = await deleteDraft(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
