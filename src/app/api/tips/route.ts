import { NextResponse } from "next/server";
import { addTip } from "@/lib/data/store";

const MIN_BODY = 12;
const MAX_BODY = 4000;

/**
 * Public tip / correction inbox. Stores on AppData.tips only.
 * Does not send email. Does not invent a mailbox confirmation.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    body?: string;
    tip?: string;
    name?: string;
    email?: string;
    url?: string;
  } | null;

  const text = (body?.body ?? body?.tip ?? "").replace(/\s+/g, " ").trim();
  if (!text || text.length < MIN_BODY) {
    return NextResponse.json(
      { error: "Write a bit more — empty tips are skipped." },
      { status: 400 },
    );
  }
  if (text.length > MAX_BODY) {
    return NextResponse.json(
      { error: "Tip is too long. Keep it under a few paragraphs." },
      { status: 400 },
    );
  }

  const name =
    typeof body?.name === "string" && body.name.trim()
      ? body.name.trim().slice(0, 120)
      : null;
  let email: string | null = null;
  if (typeof body?.email === "string" && body.email.trim()) {
    const e = body.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      return NextResponse.json(
        { error: "That email does not look right." },
        { status: 400 },
      );
    }
    email = e.slice(0, 200);
  }
  let url: string | null = null;
  if (typeof body?.url === "string" && body.url.trim()) {
    const u = body.url.trim();
    try {
      const parsed = new URL(u);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("bad protocol");
      }
      url = parsed.toString().slice(0, 500);
    } catch {
      return NextResponse.json(
        { error: "Source URL must be http(s)." },
        { status: 400 },
      );
    }
  }

  const row = await addTip({ body: text, name, email, url });
  return NextResponse.json({
    ok: true,
    id: row.id,
    message: "Got it. We read these.",
  });
}
