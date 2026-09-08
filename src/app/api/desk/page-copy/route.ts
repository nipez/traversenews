import { NextResponse } from "next/server";
import { isDeskRequestAuthed } from "@/lib/auth";
import { getAppData, setPageCopy } from "@/lib/data/store";
import {
  defaultPageCopy,
  normalizePageCopyInput,
  resolvePageCopy,
  validatePageCopy,
  type PageCopy,
} from "@/lib/page-copy";

export const dynamic = "force-dynamic";

/**
 * Desk: read/save static page copy (Events dek, About essay).
 * Blank fields on save store as empty and resolve to shipped defaults on read.
 */
export async function GET(request: Request) {
  if (!(await isDeskRequestAuthed(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = await getAppData();
  return NextResponse.json({
    copy: data.page_copy ?? defaultPageCopy(),
    resolved: resolvePageCopy(data.page_copy),
    defaults: defaultPageCopy(),
  });
}

export async function POST(request: Request) {
  if (!(await isDeskRequestAuthed(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Partial<PageCopy> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "JSON body required" }, { status: 400 });
  }

  const patch: Partial<PageCopy> = {};
  if (typeof body.hero_dek === "string") patch.hero_dek = body.hero_dek;
  if (typeof body.events_dek === "string") patch.events_dek = body.events_dek;
  if (typeof body.about_title === "string") patch.about_title = body.about_title;
  if (typeof body.about_dek === "string") patch.about_dek = body.about_dek;
  if (typeof body.about_body === "string") patch.about_body = body.about_body;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No copy fields to save" }, { status: 400 });
  }

  const current = await getAppData();
  const candidate = normalizePageCopyInput(patch, current.page_copy);
  const err = validatePageCopy(candidate);
  if (err) {
    return NextResponse.json({ error: err }, { status: 400 });
  }

  const data = await setPageCopy(patch);
  return NextResponse.json({
    ok: true,
    copy: data.page_copy,
    resolved: resolvePageCopy(data.page_copy),
  });
}
