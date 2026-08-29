import { NextResponse } from "next/server";
import { isDeskRequestAuthed } from "@/lib/auth";
import { getAppData, setPageCopy } from "@/lib/data/store";
import {
  defaultPageCopy,
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

  const candidate = {
    events_dek: typeof body.events_dek === "string" ? body.events_dek : "",
    about_title: typeof body.about_title === "string" ? body.about_title : "",
    about_dek: typeof body.about_dek === "string" ? body.about_dek : "",
    about_body: typeof body.about_body === "string" ? body.about_body : "",
    updated_at: new Date().toISOString(),
  };
  const err = validatePageCopy(candidate);
  if (err) {
    return NextResponse.json({ error: err }, { status: 400 });
  }

  const data = await setPageCopy(candidate);
  return NextResponse.json({
    ok: true,
    copy: data.page_copy,
    resolved: resolvePageCopy(data.page_copy),
  });
}
