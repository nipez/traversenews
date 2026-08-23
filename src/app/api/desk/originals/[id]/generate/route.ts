import { NextResponse } from "next/server";
import { isDeskAuthed } from "@/lib/auth";
import { generateDraftBody } from "@/lib/generate-draft";
import { getDraft, upsertDraft } from "@/lib/data/store";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Optional AI assist when OPENAI_API_KEY is set.
 * Never invents: prompt is constrained to title/dek + source_urls.
 * If the key is missing, returns generated:false and leaves the draft alone.
 */
export async function POST(_request: Request, ctx: Ctx) {
  if (!(await isDeskAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const draft = await getDraft(id);
  if (!draft) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (draft.source_urls.length === 0) {
    return NextResponse.json(
      { error: "Add a source permalink before generating" },
      { status: 400 },
    );
  }

  const result = await generateDraftBody(draft);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  if (!result.generated) {
    return NextResponse.json({
      generated: false,
      reason: result.reason,
      draft,
    });
  }

  const saved = await upsertDraft({ ...draft, body: result.body });
  return NextResponse.json({
    generated: true,
    model: result.model,
    draft: saved,
  });
}
