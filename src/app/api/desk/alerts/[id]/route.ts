import { NextResponse } from "next/server";
import { isDeskRequestAuthed } from "@/lib/auth";
import { deleteAlertStory } from "@/lib/data/store";

type Params = { params: Promise<{ id: string }> };

/**
 * Desk: delete one alert story from the strip / KV store.
 * Only src_gt911 / src_ticker_fb non-originals.
 */
export async function DELETE(request: Request, { params }: Params) {
  if (!(await isDeskRequestAuthed(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const trimmed = id?.trim();
  if (!trimmed) {
    return NextResponse.json({ error: "Missing alert id" }, { status: 400 });
  }

  try {
    const removed = await deleteAlertStory(trimmed);
    if (!removed) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      id: removed.id,
      title: removed.title,
      message: `Deleted "${removed.title}" from Alerts.`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Delete failed" },
      { status: 400 },
    );
  }
}
