import { NextResponse } from "next/server";
import { isDeskRequestAuthed } from "@/lib/auth";
import { setEmailEditionSubjectOverride } from "@/lib/data/store";
import {
  buildMorningLetterSubject,
  resolveMorningLetterSubject,
} from "@/lib/email-letter";
import {
  SUBJECT_PHRASE_HARD_MAX,
  isMorningLetterSubjectOverMax,
  morningLetterSubjectPhraseLen,
} from "@/lib/email-subject-length";

export const dynamic = "force-dynamic";

/**
 * Save or clear today’s Desk morning-letter subject override.
 *
 * Body: `{ subject_override: string | null }`
 * - Non-empty string → lock that subject for preview / send-today / send-live
 * - null / "" / whitespace → clear; fall back to buildMorningLetterSubject
 * - Phrase body (leading 🗞️ not counted) must be ≤ 84 or Save is refused
 *
 * Auth: Desk cookie OR Authorization: Bearer <DESK_IMPORT_TOKEN|DEV_DESK_PASSWORD>
 * Does not send mail.
 */
export async function POST(request: Request) {
  if (!(await isDeskRequestAuthed(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    subject_override?: unknown;
  };

  let nextOverride: string | null = null;
  if (typeof body.subject_override === "string") {
    nextOverride = body.subject_override.trim() || null;
  } else if (body.subject_override === null) {
    nextOverride = null;
  } else if (body.subject_override !== undefined) {
    return NextResponse.json(
      { error: "subject_override must be a string or null." },
      { status: 400 },
    );
  } else {
    return NextResponse.json(
      { error: "Need subject_override (string to save, null to clear)." },
      { status: 400 },
    );
  }

  if (nextOverride && isMorningLetterSubjectOverMax(nextOverride)) {
    const phrase_len = morningLetterSubjectPhraseLen(nextOverride);
    return NextResponse.json(
      {
        error: `Subject is too long (${phrase_len} / ${SUBJECT_PHRASE_HARD_MAX}). Shorten the phrase body (leading 🗞️ does not count).`,
        phrase_len,
        max: SUBJECT_PHRASE_HARD_MAX,
      },
      { status: 400 },
    );
  }

  const edition = await setEmailEditionSubjectOverride(nextOverride);
  const auto_subject = buildMorningLetterSubject(edition);
  const subject = resolveMorningLetterSubject(edition);

  return NextResponse.json({
    ok: true,
    date: edition.date,
    subject_override: edition.subject_override ?? null,
    auto_subject,
    subject,
    phrase_len: nextOverride
      ? morningLetterSubjectPhraseLen(nextOverride)
      : null,
    max: SUBJECT_PHRASE_HARD_MAX,
  });
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Subject override is POST only." },
    { status: 405 },
  );
}
