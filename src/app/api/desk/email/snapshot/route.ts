import { NextResponse } from "next/server";
import { isDeskRequestAuthed } from "@/lib/auth";
import { snapshotTodaysEmailEdition } from "@/lib/data/store";
import { emailDetroitDateKey } from "@/lib/email-editions";

/**
 * Capture / replace today's morning-email letter from the live mix.
 * Does NOT send mail to anyone.
 *
 * Auth: Desk cookie OR Authorization: Bearer <DESK_IMPORT_TOKEN|DEV_DESK_PASSWORD>
 * Optional body: { date?: "YYYY-MM-DD" } — only today (Detroit) is allowed for now.
 */
export async function POST(request: Request) {
  if (!(await isDeskRequestAuthed(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    date?: string;
  };

  const today = emailDetroitDateKey();
  if (typeof body.date === "string" && body.date.trim()) {
    const asked = body.date.trim();
    if (asked !== today) {
      return NextResponse.json(
        {
          error: "Only today's Detroit date can be captured from the live mix",
          today,
          asked,
          hint: "We do not invent a letter for another morning.",
        },
        { status: 400 },
      );
    }
  }

  const snapshot = await snapshotTodaysEmailEdition();
  return NextResponse.json({
    ok: true,
    date: snapshot.date,
    captured_at: snapshot.captured_at,
    lead: snapshot.lead?.title ?? null,
    around: snapshot.around.length,
    alerts: snapshot.alerts.length,
    tonight: snapshot.tonight.length,
    civic: snapshot.civic.length,
    sports: snapshot.sports.length,
    url: `/email/${snapshot.date}`,
    message: `Saved morning letter for ${snapshot.date}. Sending is not wired.`,
  });
}
