import { NextResponse } from "next/server";
import { isDeskRequestAuthed } from "@/lib/auth";
import { getAppData, setEditionAround } from "@/lib/data/store";
import {
  BAY_AROUND_MAX,
  deskHomeMixHint,
  emailCardToEditionCard,
  editionCardToEmailCard,
} from "@/lib/desk-home-cards";
import { normalizeDeskAroundSelection } from "@/lib/desk-letter-cards";
import { clusterStories } from "@/lib/pull/cluster";

export const dynamic = "force-dynamic";

/**
 * Save or clear today’s Desk homepage Around slate.
 *
 * Body: `{ around: EmailStoryCard[] | null }`
 * - Array (0–BAY_AROUND_MAX cards) → lock that mix for homepage / edition /
 *   pull until cleared
 * - null → clear lock; rebuild Around from the hard-news mixer
 *
 * Auth: Desk cookie OR Authorization: Bearer <DESK_IMPORT_TOKEN|DEV_DESK_PASSWORD>
 * Independent of POST /api/desk/email/cards (letter lock). Does not invent
 * reporting.
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
    const edition = await setEditionAround(null);
    return NextResponse.json({
      ok: true,
      date: edition.date,
      around: edition.around.map(editionCardToEmailCard),
      around_locked: Boolean(edition.around_locked),
      mix_hint: deskHomeMixHint(edition.around),
      max: BAY_AROUND_MAX,
    });
  }

  const parsed = normalizeDeskAroundSelection(body.around, BAY_AROUND_MAX);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const data = await getAppData();
  const clusters = clusterStories(data.stories, data.sources);
  const editionCards = parsed.around.map((card) => {
    const match = clusters.find((c) => c.url === card.url);
    return emailCardToEditionCard(card, match?.published_at);
  });

  const edition = await setEditionAround(editionCards);
  return NextResponse.json({
    ok: true,
    date: edition.date,
    around: edition.around.map(editionCardToEmailCard),
    around_locked: Boolean(edition.around_locked),
    mix_hint: deskHomeMixHint(edition.around),
    max: BAY_AROUND_MAX,
  });
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Homepage bay card picker is POST only." },
    { status: 405 },
  );
}
