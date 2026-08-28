import { NextResponse } from "next/server";
import { isDeskRequestAuthed } from "@/lib/auth";
import {
  confirmEventTip,
  dismissEventTip,
} from "@/lib/data/store";

type Params = { params: Promise<{ id: string }> };

/**
 * Desk: confirm (import one row to events as src_reader_events) or dismiss.
 * Never silent auto-add.
 */
export async function POST(request: Request, { params }: Params) {
  if (!(await isDeskRequestAuthed(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    action?: string;
  } | null;
  const action = body?.action?.trim();

  try {
    if (action === "confirm") {
      const { tip, event } = await confirmEventTip(id);
      return NextResponse.json({
        ok: true,
        tip,
        event,
        message: `Confirmed — now on Events (${event.id}).`,
      });
    }
    if (action === "dismiss") {
      const tip = await dismissEventTip(id);
      return NextResponse.json({
        ok: true,
        tip,
        message: "Dismissed — not added to Events.",
      });
    }
    return NextResponse.json(
      { error: "Body must be { action: \"confirm\" | \"dismiss\" }" },
      { status: 400 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 },
    );
  }
}
