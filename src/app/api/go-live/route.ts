import { NextResponse } from "next/server";
import { publishDueDrafts } from "@/lib/data/store";

export const dynamic = "force-dynamic";

/**
 * Scheduled go-live publisher for Desk originals.
 * Called by the Worker cron (every 5 minutes) and also by the morning pull cron.
 * Same publishDraft path as Desk "Publish now" — rebuilds public snapshots once per due draft.
 */
async function run() {
  const result = await publishDueDrafts();
  return NextResponse.json({
    ok: true,
    published: result.published,
    errors: result.errors,
  });
}

export async function POST() {
  return run();
}

export async function GET() {
  return run();
}
