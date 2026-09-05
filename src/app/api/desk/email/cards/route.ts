import { NextResponse } from "next/server";
import { isDeskRequestAuthed } from "@/lib/auth";
import { setEmailEditionAround } from "@/lib/data/store";
import {
  deskLetterMixHint,
  normalizeDeskAroundSelection,
} from "@/lib/desk-letter-cards";
import { LETTER_AROUND_MAX } from "@/lib/email-editions";
import {
  buildMorningLetterSubject,
  resolveMorningLetterSubject,
} from "@/lib/email-letter";

export const dynamic = "force-dynamic";

/**
 * Save or clear today’s Desk morning-letter Around slate.
 *
 * Body: `{ around: EmailStoryCard[] | null }`
 * - Array (0–6 cards) → lock that mix for preview / send-today / send-live / pull
 * - null → clear lock; rebuild Around from the live mixer (keeps subject_override)
 *
 * Auth: Desk cookie OR Authorization: Bearer <DESK_IMPORT_TOKEN|DEV_DESK_PASSWORD>
 * Does not send mail. Does not invent reporting.
 */
export async function POST(request: Request) {
  if (!(await isDeskRequestAuthed(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    around?: unknown;
  };

  if (!("around" in body)) {
    return NextResponse.json(
      { error: "Need around (card array to save, null to reset to auto)." },
      { status: 400 },
    );
  }

  if (body.around === null) {
    const edition = await setEmailEditionAround(null);
    return NextResponse.json({
      ok: true,
      date: edition.date,
      around: edition.around,
      around_locked: Boolean(edition.around_locked),
      subject_override: edition.subject_override ?? null,
      auto_subject: buildMorningLetterSubject(edition),
      subject: resolveMorningLetterSubject(edition),
      mix_hint: deskLetterMixHint(edition.around),
      max: LETTER_AROUND_MAX,
    });
  }

  const parsed = normalizeDeskAroundSelection(body.around);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const edition = await setEmailEditionAround(parsed.around);
  return NextResponse.json({
    ok: true,
    date: edition.date,
    around: edition.around,
    around_locked: Boolean(edition.around_locked),
    subject_override: edition.subject_override ?? null,
    auto_subject: buildMorningLetterSubject(edition),
    subject: resolveMorningLetterSubject(edition),
    mix_hint: deskLetterMixHint(edition.around),
    max: LETTER_AROUND_MAX,
  });
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Letter card picker is POST only." },
    { status: 405 },
  );
}
