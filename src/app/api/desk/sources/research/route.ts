import { NextResponse } from "next/server";
import { isDeskAuthed } from "@/lib/auth";
import { researchSourceUrl } from "@/lib/desk/research-source";
import { getAppData } from "@/lib/data/store";

export async function POST(request: Request) {
  if (!(await isDeskAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { url?: string };
  const url = body.url?.trim();
  if (!url) {
    return NextResponse.json({ error: "Paste a URL to research" }, { status: 400 });
  }

  const data = await getAppData();
  const research = await researchSourceUrl({
    url,
    beats: data.beats,
    existing: data.sources,
  });

  return NextResponse.json({ research });
}
