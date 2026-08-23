import { NextResponse } from "next/server";
import { isDeskRequestAuthed } from "@/lib/auth";
import { getAppData } from "@/lib/data/store";
import {
  buildEmailEditionSnapshot,
  emailDetroitDateKey,
} from "@/lib/email-editions";
import { renderMorningLetterHtml } from "@/lib/email/render-letter-html";
import {
  DEFAULT_TEST_RECIPIENT,
  getResendApiKeyAsync,
  sendLetterToRecipients,
} from "@/lib/email/resend";

/**
 * Send today's morning letter via Resend.
 *
 * Auth: Desk cookie OR Authorization: Bearer <DESK_IMPORT_TOKEN|DEV_DESK_PASSWORD>
 *
 * Body (optional):
 *   { "to": ["a@b.com"] }           — explicit recipients
 *   { "audience": "subscribers" }   — saved signup list (KV)
 *   omitted / {}                    — ONLY nickperez@gmail.com (test default)
 *
 * Never blasts subscribers unless audience is explicitly "subscribers".
 *
 * KV: one `getAppData()` read of `app_data` only — subscribers live in that
 * document. Prefer today's archived email edition; build once from live mix
 * only if missing. HTML is rendered once and reused for every recipient.
 */
export async function POST(request: Request) {
  if (!(await isDeskRequestAuthed(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = await getResendApiKeyAsync();
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "RESEND_API_KEY is not set on the Worker",
        hint: "npx wrangler secret put RESEND_API_KEY",
      },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    to?: unknown;
    audience?: unknown;
  };

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://traverse.news";
  const unsubscribeUrl = `${siteUrl}/email#signup`;

  // Single KV read (`app_data`). No list(), no per-subscriber keys.
  const data = await getAppData();
  const today = emailDetroitDateKey();
  const archived = data.email_editions?.find((e) => e.date === today);
  const letter = archived ?? buildEmailEditionSnapshot(data);
  const letterSource = archived ? "email_edition" : "live_mix";

  let recipients: string[] = [];
  let audience: "test" | "explicit" | "subscribers" = "test";

  if (Array.isArray(body.to) && body.to.length > 0) {
    audience = "explicit";
    recipients = body.to.filter((v): v is string => typeof v === "string");
  } else if (body.audience === "subscribers") {
    audience = "subscribers";
    recipients = data.subscribers.map((s) => s.email);
  } else {
    // Default: single test address. Never the full list.
    audience = "test";
    recipients = [DEFAULT_TEST_RECIPIENT];
  }

  const cleaned = [
    ...new Set(
      recipients
        .map((e) => e.trim().toLowerCase())
        .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)),
    ),
  ];

  if (cleaned.length === 0) {
    return NextResponse.json(
      {
        error:
          audience === "subscribers"
            ? "No subscribers stored yet"
            : "No valid recipient emails",
        audience,
      },
      { status: 400 },
    );
  }

  const rendered = renderMorningLetterHtml(letter, {
    siteUrl,
    unsubscribeUrl,
  });

  const { sent, failed } = await sendLetterToRecipients({
    apiKey,
    recipients: cleaned,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    listUnsubscribeUrl: unsubscribeUrl,
  });

  return NextResponse.json({
    ok: failed.length === 0,
    audience,
    letter_source: letterSource,
    from: "Traverse News <letter@traverse.news>",
    date: letter.date,
    subject: rendered.subject,
    recipient_count: cleaned.length,
    sent: sent.length,
    failed: failed.length,
    failures: failed.slice(0, 20),
    message:
      audience === "subscribers"
        ? `Sent morning letter to ${sent.length} subscriber(s).`
        : `Sent morning letter to ${sent.length} test recipient(s).`,
  });
}
