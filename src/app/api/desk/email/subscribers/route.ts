import { NextResponse } from "next/server";
import { isDeskRequestAuthed } from "@/lib/auth";
import { removeSubscriber } from "@/lib/data/store";

export const dynamic = "force-dynamic";

/**
 * Desk: move one morning-scan signup to Unsubscribed.
 * Auth: Desk cookie OR Bearer token.
 */
export async function DELETE(request: Request) {
  if (!(await isDeskRequestAuthed(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = (body.email || url.searchParams.get("email") || "")
    .trim()
    .toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }
  const result = await removeSubscriber(email);
  if (!result.moved && !result.already) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    email: result.email,
    moved: result.moved,
    already: result.already,
  });
}
