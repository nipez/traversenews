import { NextResponse } from "next/server";
import { isDeskRequestAuthed } from "@/lib/auth";
import { removeSubscriber } from "@/lib/data/store";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Desk: remove one morning-scan signup address.
 *
 * DELETE body or query: { email } / ?email=
 *
 * Auth: Desk cookie OR Authorization: Bearer <DESK_IMPORT_TOKEN|DEV_DESK_PASSWORD>
 */
export async function DELETE(request: Request) {
  if (!(await isDeskRequestAuthed(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const queryEmail = url.searchParams.get("email");
  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
  } | null;
  const raw =
    (typeof body?.email === "string" ? body.email : null) ?? queryEmail ?? "";
  const email = raw.trim().toLowerCase();

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Body or query must include a valid email" },
      { status: 400 },
    );
  }

  const result = await removeSubscriber(email);
  return NextResponse.json({
    ok: true,
    email: result.email,
    removed: result.removed,
    message: result.removed
      ? `Removed ${result.email} from Morning-scan signups.`
      : `${result.email} was not on the list.`,
  });
}
