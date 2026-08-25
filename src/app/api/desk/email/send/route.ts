import { NextResponse } from "next/server";
import { isDeskRequestAuthed } from "@/lib/auth";
import {
  getAppData,
  getEmailLetterSend,
  markEmailLetterSent,
  snapshotTodaysEmailEdition,
} from "@/lib/data/store";
import { emailDetroitDateKey } from "@/lib/email-editions";
import {
  buildMorningLetter,
  isDetroitSunday,
  pickLetterSchoolDate,
  resolveLetterRecipients,
} from "@/lib/email-letter";
import { runPull } from "@/lib/pull/run";

export const dynamic = "force-dynamic";

async function getResendApiKey(): Promise<string | null> {
  const processKey = process.env.RESEND_API_KEY?.trim();
  if (processKey) return processKey;

  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const context = await getCloudflareContext({ async: true });
    const bindingKey = (
      context.env as CloudflareEnv | undefined
    )?.RESEND_API_KEY?.trim();
    if (bindingKey) return bindingKey;
  } catch {
    // Cloudflare context unavailable during some Next.js build steps.
  }

  return null;
}

/**
 * Send today's morning letter via Resend (Worker cron + Desk).
 *
 * Auth: Desk cookie OR Authorization: Bearer <DESK_IMPORT_TOKEN|DEV_DESK_PASSWORD>
 *
 * Hard rule: never attach anything. Do not include `attachments`, calendar
 * parts, `scheduled_at` file payloads, or an empty `attachments: []` key in
 * the Resend JSON - omit the field entirely. Payload is only
 * from / to / reply_to / subject / html / text.
 */
export async function POST(request: Request) {
  if (!(await isDeskRequestAuthed(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    force?: unknown;
  };
  const force = body.force === true;

  if (isDetroitSunday()) {
    return NextResponse.json({ ok: true, skipped: "sunday" });
  }

  const today = emailDetroitDateKey();
  if (!force && (await getEmailLetterSend(today))) {
    return NextResponse.json({ ok: true, already_sent: true, date: today });
  }

  await runPull();

  const edition = await snapshotTodaysEmailEdition();
  const data = await getAppData();
  const school = pickLetterSchoolDate(data.schools ?? []);
  const letter = buildMorningLetter(edition, { school });
  const recipients = resolveLetterRecipients(data.subscribers ?? []);
  const apiKey = await getResendApiKey();

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "RESEND_API_KEY is not set on the Worker. Letter was not sent.",
        date: edition.date,
        subject: letter.subject,
      },
      { status: 500 },
    );
  }

  // Attachments are forbidden on the morning letter. Keep this object literal
  // limited to from/to/reply_to/subject/html/text - never add attachments.
  const resendPayload = {
    from: "Traverse News <info@traverse.news>",
    to: recipients,
    reply_to: "info@traverse.news",
    subject: letter.subject,
    html: letter.html,
    text: letter.text,
  };

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(resendPayload),
  });
  const responseBody = await resendResponse.text();

  if (!resendResponse.ok) {
    return NextResponse.json(
      {
        error: "Resend rejected the send. Letter was not marked sent.",
        status: resendResponse.status,
        detail: responseBody.slice(0, 300),
        date: edition.date,
        subject: letter.subject,
        recipient_count: recipients.length,
      },
      { status: 502 },
    );
  }

  let resendId: string | null = null;
  try {
    const parsed = JSON.parse(responseBody) as { id?: unknown };
    resendId = typeof parsed.id === "string" ? parsed.id : null;
  } catch {
    resendId = null;
  }

  await markEmailLetterSent(edition.date, {
    sent_at: new Date().toISOString(),
    resend_id: resendId ?? undefined,
    subject: letter.subject,
  });

  return NextResponse.json({
    ok: true,
    date: edition.date,
    subject: letter.subject,
    recipient_count: recipients.length,
    resend_id: resendId,
    archive_url: `/email/${edition.date}`,
  });
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Morning letter send is POST only." },
    { status: 405 },
  );
}
