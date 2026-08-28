import { NextResponse } from "next/server";
import { removeSubscriber } from "@/lib/data/store";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: string;
  } | null;
  const email = body?.email?.trim().toLowerCase() ?? "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }
  const result = await removeSubscriber(email);
  return NextResponse.json({
    ok: true,
    email: result.email,
    removed: result.removed,
  });
}
