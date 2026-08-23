import { NextResponse } from "next/server";
import { addEventTip } from "@/lib/data/store";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

/**
 * Public “Something missing?” night-out suggestions.
 * Stores pending AppData.event_tips only — never writes public Events.
 * Do not invent times; omit time → stays blank (time_unknown on confirm).
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    title?: string;
    date?: string;
    time?: string;
    place?: string;
    url?: string;
    note?: string;
    name?: string;
    email?: string;
  } | null;

  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title || title.length < 3) {
    return NextResponse.json(
      { error: "Title is required." },
      { status: 400 },
    );
  }
  if (title.length > 200) {
    return NextResponse.json(
      { error: "Title is too long." },
      { status: 400 },
    );
  }

  const date = typeof body?.date === "string" ? body.date.trim() : "";
  if (!DATE_RE.test(date)) {
    return NextResponse.json(
      { error: "Date is required (YYYY-MM-DD)." },
      { status: 400 },
    );
  }

  let time: string | null = null;
  if (typeof body?.time === "string" && body.time.trim()) {
    const t = body.time.trim().slice(0, 5);
    if (!TIME_RE.test(t)) {
      return NextResponse.json(
        { error: "Time must be HH:mm, or leave blank." },
        { status: 400 },
      );
    }
    time = t;
  }

  const place =
    typeof body?.place === "string" && body.place.trim()
      ? body.place.trim().slice(0, 200)
      : null;
  const note =
    typeof body?.note === "string" && body.note.trim()
      ? body.note.trim().slice(0, 1000)
      : null;
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
    try {
      const parsed = new URL(body.url.trim());
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("bad protocol");
      }
      url = parsed.toString().slice(0, 500);
    } catch {
      return NextResponse.json(
        { error: "Official listing URL must be http(s)." },
        { status: 400 },
      );
    }
  }

  const row = await addEventTip({
    title,
    date,
    time,
    place,
    url,
    note,
    name,
    email,
  });

  return NextResponse.json({
    ok: true,
    id: row.id,
    status: row.status,
    message:
      "Thanks — we got it. It will not appear on Events until the desk confirms.",
  });
}
