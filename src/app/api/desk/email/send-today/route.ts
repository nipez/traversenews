import { NextResponse } from "next/server";
import { isDeskRequestAuthed } from "@/lib/auth";
import {
  getAppData,
  getEmailEdition,
  getEmailLetterSend,
  getEmailOneOffSends,
  markEmailOneOffSent,
} from "@/lib/data/store";
import { emailDetroitDateKey } from "@/lib/email-editions";
import {
  buildMorningLetter,
  isDetroitSunday,
  pickLetterSchoolDate,
} from "@/lib/email-letter";
import { getSite } from "@/lib/sites";

export const dynamic = "force-dynamic";

function isNonRealSubscriberEmail(value: string): boolean {
  const email = value.trim().toLowerCase();
  if (!email || !email.includes("@")) return true;
  const domain = email.split("@")[1] ?? "";
  return (
    domain === "example.com" ||
    domain.endsWith(".example.com") ||
    domain === "example.org" ||
    domain === "example.net" ||
    domain === "test" ||
    domain.endsWith(".test") ||
    domain === "invalid" ||
    domain.endsWith(".invalid") ||
    domain.endsWith(".localhost") ||
    email.includes("desk-list-verify") ||
    /(^|[.+_-])(verify|fake|placeholder|dummy)([.+_-]|$)/.test(email) ||
    email.startsWith("noreply@") ||
    email.startsWith("no-reply@") ||
    email.startsWith("donotreply@")
  );
}

async function getResendApiKey(): Promise<string | null> {
  const fromProcess = process.env.RESEND_API_KEY?.trim();
  if (fromProcess) return fromProcess;
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = await getCloudflareContext({ async: true });
    const key = (ctx.env as CloudflareEnv | undefined)?.RESEND_API_KEY?.trim();
    if (key) return key;
  } catch {
    // Plain next dev without Worker secrets.
  }
  return null;
}

/**
 * Mail today's already-captured letter to one subscriber.
 * Does not pull, does not re-blast the list, does not reset the live send stamp.
 */
export async function POST(request: Request) {
  if (!(await isDeskRequestAuthed(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isDetroitSunday()) {
    return NextResponse.json({ ok: true, skipped: "sunday" });
  }

  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = (body.email || "").trim().toLowerCase();
  if (!email || !email.includes("@") || isNonRealSubscriberEmail(email)) {
    return NextResponse.json(
      { error: "Need a real subscriber address." },
      { status: 400 },
    );
  }

  const data = await getAppData();
  const onList = (data.subscribers ?? []).some(
    (row) => row.email.trim().toLowerCase() === email,
  );
  if (!onList) {
    return NextResponse.json(
      { error: "That address is not on the morning-scan list." },
      { status: 404 },
    );
  }

  const date = emailDetroitDateKey();
  const already = await getEmailOneOffSends(date);
  if (date === "2026-08-28" && !already.includes("stacietceye@hotmail.com")) {
    already.push("stacietceye@hotmail.com");
  }
  const live = await getEmailLetterSend(date);
  const row = (data.subscribers ?? []).find(
    (item) => item.email.trim().toLowerCase() === email,
  );
  const inLiveBlast = Boolean(
    live?.sent_at &&
      row &&
      new Date(row.created_at).getTime() <= new Date(live.sent_at).getTime(),
  );
  if (already.includes(email) || inLiveBlast) {
    return NextResponse.json(
      { error: "Already sent today's letter to that address." },
      { status: 409 },
    );
  }

  const snapshot = await getEmailEdition(date);
  if (!snapshot) {
    return NextResponse.json(
      { error: "No letter captured for today yet." },
      { status: 400 },
    );
  }

  const letter = buildMorningLetter(snapshot, {
    school: pickLetterSchoolDate(data.schools ?? []),
    unsubscribeEmail: email,
  });

  const apiKey = await getResendApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY is not set. Letter was not sent." },
      { status: 500 },
    );
  }

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${getSite().emailFromName} <${getSite().emailFromAddress}>`,
      to: [email],
      reply_to: getSite().emailFromAddress,
      subject: letter.subject,
      html: letter.html,
      text: letter.text,
    }),
  });
  const resendText = await resendRes.text();
  if (!resendRes.ok) {
    return NextResponse.json(
      {
        error: "Resend rejected the send.",
        status: resendRes.status,
        detail: resendText.slice(0, 300),
      },
      { status: 502 },
    );
  }

  await markEmailOneOffSent(date, email);

  return NextResponse.json({
    ok: true,
    date,
    email,
    subject: letter.subject,
  });
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Send today is POST only." },
    { status: 405 },
  );
}
