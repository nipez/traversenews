import { NextResponse } from "next/server";
import { getSectionHeaderObject } from "@/lib/data/r2";
import { isSectionHeaderId } from "@/lib/section-headers";

export const dynamic = "force-dynamic";

/**
 * Stream a Desk-uploaded section header from R2.
 * Seed /art/*.jpg files are served by static assets, not this route.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!isSectionHeaderId(id)) {
    return NextResponse.json({ error: "Unknown section" }, { status: 404 });
  }

  const obj = await getSectionHeaderObject(id);
  if (!obj || !obj.body) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const headers = new Headers();
  headers.set(
    "Content-Type",
    obj.httpMetadata?.contentType ?? "image/jpeg",
  );
  headers.set("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  return new NextResponse(obj.body, { status: 200, headers });
}
