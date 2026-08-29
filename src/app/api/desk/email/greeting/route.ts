import { NextResponse } from "next/server";
import { isDeskRequestAuthed } from "@/lib/auth";
import { saveTodaysEmailGreeting } from "@/lib/data/store";

/**
 * Save Nick's morning-letter greeting onto today's email edition.
 * Does NOT send mail.
 *
 * Auth: Desk cookie OR Authorization: Bearer <DESK_IMPORT_TOKEN|DEV_DESK_PASSWORD>
 * Body: { greeting: string }
 */
export async function POST(request: Request) {
  if (!(await isDeskRequestAuthed(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    greeting?: unknown;
  };

  if (typeof body.greeting !== "string") {
    return NextResponse.json(
      { error: "greeting string required" },
      { status: 400 },
    );
  }

  try {
    const snapshot = await saveTodaysEmailGreeting(body.greeting);
    return NextResponse.json({
      ok: true,
      date: snapshot.date,
      greeting: snapshot.greeting,
      url: `/email/${snapshot.date}`,
      message: `Saved greeting for ${snapshot.date}.`,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Could not save greeting",
      },
      { status: 400 },
    );
  }
}
