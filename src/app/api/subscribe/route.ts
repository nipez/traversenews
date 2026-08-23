import { NextResponse } from "next/server";
import { addSubscriber } from "@/lib/data/store";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: string;
  } | null;
  const email = body?.email?.trim().toLowerCase() ?? "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }
  const row = await addSubscriber(email);
  return NextResponse.json({ ok: true, email: row.email });
}
