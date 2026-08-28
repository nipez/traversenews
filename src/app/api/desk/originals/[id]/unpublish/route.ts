import { NextResponse } from "next/server";
import { isDeskAuthed } from "@/lib/auth";
import { unpublishDraft } from "@/lib/data/store";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  if (!(await isDeskAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  try {
    const draft = await unpublishDraft(id);
    return NextResponse.json({ draft });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unpublish failed" },
      { status: 400 },
    );
  }
}
