import { NextResponse } from "next/server";
import { isDeskRequestAuthed } from "@/lib/auth";
import { setEmailEditionLead } from "@/lib/data/store";
import { normalizeDeskLeadSelection } from "@/lib/desk-letter-cards";
import {
  buildMorningLetterSubject,
  resolveMorningLetterSubject,
} from "@/lib/email-letter";

export const dynamic = "force-dynamic";

/**
 * Save or clear today’s Desk “The one to read” lead.
 *
 * Body: `{ lead: EmailStoryCard | null }`
 * - Card → lock that lead for preview / send / pull (survives snapshot like
 *   subject_override). When the card is on Around, it is removed and Around
 *   is backfilled to keep its count; an existing Around lock stays locked.
 * - null → clear lock; rebuild auto lead (keeps subject_override + Around lock)
 *
 * Auth: Desk cookie OR Authorization: Bearer <DESK_IMPORT_TOKEN|DEV_DESK_PASSWORD>
 * Does not send mail. Does not invent reporting.
 */
export async function POST(request: Request) {
  if (!(await isDeskRequestAuthed(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    lead?: unknown;
  };

  if (!("lead" in body)) {
    return NextResponse.json(
      { error: "Need lead (card to save, null to reset to auto)." },
      { status: 400 },
    );
  }

  if (body.lead === null) {
    const edition = await setEmailEditionLead(null);
    return NextResponse.json({
      ok: true,
      date: edition.date,
      lead: edition.lead,
      lead_locked: Boolean(edition.lead_locked),
      around: edition.around,
      around_locked: Boolean(edition.around_locked),
      subject_override: edition.subject_override ?? null,
      auto_subject: buildMorningLetterSubject(edition),
      subject: resolveMorningLetterSubject(edition),
    });
  }

  const parsed = normalizeDeskLeadSelection(body.lead);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const edition = await setEmailEditionLead(parsed.lead);
  return NextResponse.json({
    ok: true,
    date: edition.date,
    lead: edition.lead,
    lead_locked: Boolean(edition.lead_locked),
    around: edition.around,
    around_locked: Boolean(edition.around_locked),
    subject_override: edition.subject_override ?? null,
    auto_subject: buildMorningLetterSubject(edition),
    subject: resolveMorningLetterSubject(edition),
  });
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Letter lead override is POST only." },
    { status: 405 },
  );
}
