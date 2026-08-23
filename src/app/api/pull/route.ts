import { NextResponse } from "next/server";
import { runPull } from "@/lib/pull/run";

export const dynamic = "force-dynamic";

export async function POST() {
  const result = await runPull();
  return NextResponse.json(result);
}

export async function GET() {
  const result = await runPull();
  return NextResponse.json(result);
}
