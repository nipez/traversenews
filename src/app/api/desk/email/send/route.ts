import { NextResponse } from "next/server";
import { isDeskRequestAuthed } from "@/lib/auth";
import {
  getAppData,
  getEmailEdition,
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

type ResendDelivery = {
  ok: boolean;
  resendId: string | null;
};

/** Stay under Resend's 10 req/s (~5/sec with margin). */
const RESEND_SEND_GAP_MS = 200;
/** Retry a 429 once or twice with linear backoff. */
const RESEND_429_MAX_RETRIES = 2;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * One Resend call, one visible recipient. Never put more than one address in
 * to / cc / bcc on a single payload — that leaked the whole list in Gmail.
 *
 * Retries HTTP 429 up to RESEND_429_MAX_RETRIES times (500ms, then 1s).
 */
async function sendLetterToOneRecipient(args: {
  apiKey: string;
  email: string;
  subject: string;
  html: string;
  text: string;
}): Promise<ResendDelivery> {
  // Attachments are forbidden on the morning letter. Keep this object literal
  // limited to from/to/reply_to/subject/html/text - never add attachments,
  // cc, or bcc.
  const resendPayload = {
    from: "Traverse News <info@traverse.news>",
    to: [args.email],
    reply_to: "info@traverse.news",
    subject: args.subject,
    html: args.html,
    text: args.text,
  };

  for (let attempt = 0; attempt <= RESEND_429_MAX_RETRIES; attempt++) {
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resendPayload),
    });
    const responseBody = await resendResponse.text();

    if (resendResponse.ok) {
      let resendId: string | null = null;
      try {
        const parsed = JSON.parse(responseBody) as { id?: unknown };
        resendId = typeof parsed.id === "string" ? parsed.id : null;
      } catch {
        resendId = null;
      }
      return { ok: true, resendId };
    }

    if (resendResponse.status === 429 && attempt < RESEND_429_MAX_RETRIES) {
      await sleep(500 * (attempt + 1));
      continue;
    }

    return { ok: false, resendId: null };
  }

  return { ok: false, resendId: null };
}

/**
 * Send today's morning letter via Resend (Worker cron preview + Desk live).
 *
 * Body:
 * - `{ preview: true }` — Nick-only preview (`Preview · ` subject on Worker
 *   cron). Uses today’s stored `email_editions` row when present.
 * - `{}` or `{ force: true }` — live send to resolveLetterRecipients; marks
 *   morning_letter_sent.
 * - `{ rebuild: true }` — pull + recapture today’s letter before mailing
 *   (clobbers a restage). Default is to mail the stored snapshot.
 *
 * Auth: Desk cookie OR Authorization: Bearer <DESK_IMPORT_TOKEN|DEV_DESK_PASSWORD>
 *
 * Hard rule: never attach anything. Do not include `attachments`, calendar
 * parts, `scheduled_at` file payloads, or an empty `attachments: []` key in
 * the Resend JSON - omit the field entirely. Payload is only
 * from / to / reply_to / subject / html / text.
 *
 * Privacy: one Resend API call per recipient with `to: [thatEmail]` only.
 * Never blast the full list in a single `to` / `cc` / `bcc`.
 * Pace ~200ms between calls (under Resend 10/s) and retry 429 with backoff.
 */
export async function POST(request: Request) {
  if (!(await isDeskRequestAuthed(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    force?: unknown;
    preview?: unknown;
    rebuild?: unknown;
  };
  const force = body.force === true;
  const preview = body.preview === true;
  const rebuild = body.rebuild === true;

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

  // Prefer today’s stored / restaged letter. runPull also snapshots and would
  // clobber a Desk restage — only pull+recapture when missing or rebuild.
  const stored = await getEmailEdition(today);
  let edition = stored && !rebuild ? stored : null;
  if (!edition) {
    await runPull();
    edition =
      (await getEmailEdition(today)) ?? (await snapshotTodaysEmailEdition());
  }

  const data = await getAppData();
  const school = pickLetterSchoolDate(data.schools ?? []);
  const recipients = preview
    ? resolvePreviewLetterRecipients()
    : resolveLetterRecipients(data.subscribers ?? []);
  const apiKey = await getResendApiKey();

  // Subject is shared; html/text are rebuilt per recipient for unsubscribe.
  const subjectLetter = buildMorningLetter(edition, { school });
  const subject = preview
    ? previewLetterSubject(subjectLetter.subject)
    : subjectLetter.subject;

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

  let sentCount = 0;
  let failedCount = 0;
  let firstResendId: string | null = null;

  // Pace one-at-a-time sends under Resend's 10 req/s. Do not batch to[] /
  // cc / bcc — that leaked the list. Optional later: Resend batch API with
  // one to per item.
  for (let index = 0; index < recipients.length; index++) {
    if (index > 0) {
      await sleep(RESEND_SEND_GAP_MS);
    }

    const email = recipients[index];
    const letter = buildMorningLetter(edition, {
      school,
      unsubscribeEmail: email,
    });

    let delivery: ResendDelivery;
    try {
      delivery = await sendLetterToOneRecipient({
        apiKey,
        email,
        subject,
        html: letter.html,
        text: letter.text,
      });
    } catch {
      delivery = { ok: false, resendId: null };
    }

    if (delivery.ok) {
      sentCount += 1;
      if (!firstResendId && delivery.resendId) {
        firstResendId = delivery.resendId;
      }
    } else {
      failedCount += 1;
    }
  }

  const recipientCount = recipients.length;

  if (failedCount > 0 || sentCount === 0) {
    return NextResponse.json(
      {
        error:
          sentCount === 0
            ? preview
              ? "Resend rejected every preview delivery. Preview was not marked sent."
              : "Resend rejected every delivery. Letter was not marked sent."
            : preview
              ? `Some preview deliveries failed (${sentCount} sent, ${failedCount} failed). Preview was not marked sent.`
              : `Some deliveries failed (${sentCount} sent, ${failedCount} failed). Letter was not marked sent.`,
        date: edition.date,
        subject,
        recipient_count: recipientCount,
        sent_count: sentCount,
        failed_count: failedCount,
        preview,
      },
      { status: 502 },
    );
  }

  const record = {
    sent_at: new Date().toISOString(),
    resend_id: firstResendId ?? undefined,
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
    recipient_count: recipientCount,
    sent_count: sentCount,
    failed_count: failedCount,
    resend_id: firstResendId,
    archive_url: `/email/${edition.date}`,
    preview,
    used_stored: Boolean(stored && !rebuild),
  });
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Morning letter send is POST only." },
    { status: 405 },
  );
}
