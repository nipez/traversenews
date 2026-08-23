import { NextResponse } from "next/server";
import { clearDeskSession } from "@/lib/auth";

export async function POST() {
  await clearDeskSession();
  return NextResponse.json({ ok: true });
}
