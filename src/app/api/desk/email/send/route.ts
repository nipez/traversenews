import { NextResponse } from "next/server";
import { isDeskRequestAuthed } from "@/lib/auth";
import {
  getAppData,
  getEmailLetterPreview,
  getEmailLetterSend,
  markEmailLetterPreviewed,
  markEmailLetterSent,
  snapshotTodaysEmailEdition,
} from "@/lib/data/store";
import { emailDetroitDateKey } from "@/lib/email-editions";
import {
  buildMorningLetter,
  isDetroitSunday,
  pickLetterSchoolDate,
  previewLetterSubject,
  resolveLetterRecipients,
  resolvePreviewLetterRecipients,
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
 * Send today's morning letter via Resend (Worker cron preview + Desk live).
 *
 * Body:
 * - `{ preview: true }` — Nick-only preview (`Preview · ` subject). Own
 *   idempotency key; does NOT mark the day as publicly sent.
 * - `{}` or `{ force: true }` — live send to resolveLetterRecipients; marks
 *   morning_letter_sent.
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
    preview?: unknown;
  };
  const force = body.force === true;
  const preview = body.preview === true;

  if (isDetroitSunday()) {
    return NextResponse.json({ ok: true, skipped: "sunday" });
  }

  const today = emailDetroitDateKey();

  if (preview) {
    if (!force && (await getEmailLetterPreview(today))) {
      return NextResponse.json({
        ok: true,
        already_previewed: true,
        preview: true,
        date: today,
      });
    }
  } else if (!force && (await getEmailLetterSend(today))) {
    return NextResponse.json({ ok: true, already_sent: true, date: today });
  }

  await runPull();

  const edition = await snapshotTodaysEmailEdition();
  const data = await getAppData();
  const school = pickLetterSchoolDate(data.schools ?? []);
  const recipients = preview
    ? resolvePreviewLetterRecipients()
    : resolveLetterRecipients(data.subscribers ?? []);
  const letter = buildMorningLetter(edition, {
    school,
    unsubscribeEmail:
      recipients.length === 1 ? recipients[0] : undefined,
  });
  const subject = preview
    ? previewLetterSubject(letter.subject)
    : letter.subject;
  const apiKey = await getResendApiKey();

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "RESEND_API_KEY is not set on the Worker. Letter was not sent.",
        date: edition.date,
        subject,
        preview,
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
    subject,
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
        error: preview
          ? "Resend rejected the preview. Preview was not marked sent."
          : "Resend rejected the send. Letter was not marked sent.",
        status: resendResponse.status,
        detail: responseBody.slice(0, 300),
        date: edition.date,
        subject,
        recipient_count: recipients.length,
        preview,
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

  const record = {
    sent_at: new Date().toISOString(),
    resend_id: resendId ?? undefined,
    subject,
  };

  if (preview) {
    // Preview must not flip morning_letter_sent — Desk can still send live.
    await markEmailLetterPreviewed(edition.date, record);
  } else {
    await markEmailLetterSent(edition.date, record);
  }

  return NextResponse.json({
    ok: true,
    date: edition.date,
    subject,
    recipient_count: recipients.length,
    resend_id: resendId,
    archive_url: `/email/${edition.date}`,
    preview,
  });
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Morning letter send is POST only." },
    { status: 405 },
  );
}
