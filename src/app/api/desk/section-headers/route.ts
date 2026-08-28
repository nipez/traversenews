import { NextResponse } from "next/server";
import { isDeskRequestAuthed } from "@/lib/auth";
import {
  deleteSectionHeaderObject,
  putSectionHeaderObject,
} from "@/lib/data/r2";
import { getAppData, setSectionHeader } from "@/lib/data/store";
import {
  isSectionHeaderId,
  mediaSectionPath,
  SECTION_HEADER_SEEDS,
} from "@/lib/section-headers";
import type { SectionHeaderMeta } from "@/lib/types";

export const dynamic = "force-dynamic";

const MAX_BYTES = 4.5 * 1024 * 1024; // stay under Worker request body limits

function defaultAlt(id: string): string {
  if (isSectionHeaderId(id) && SECTION_HEADER_SEEDS[id]?.alt) {
    return SECTION_HEADER_SEEDS[id]!.alt;
  }
  return "Section header photo";
}

/**
 * Desk: set or clear a section page photo header.
 *
 * - multipart: field `id` + file `file` → R2 object + thin pointer
 * - JSON: `{ id, src?, alt?, clear? }` → paste URL or clear
 *
 * Bytes never go into `app_data` (hypothesis: avoids fat-save 1102).
 */
export async function POST(request: Request) {
  if (!(await isDeskRequestAuthed(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const idRaw = String(form.get("id") ?? "").trim();
    if (!isSectionHeaderId(idRaw)) {
      return NextResponse.json({ error: "Unknown section id" }, { status: 400 });
    }
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image too large (max ~4.5MB)" },
        { status: 400 },
      );
    }
    const mime = file.type || "image/jpeg";
    if (!mime.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const wrote = await putSectionHeaderObject({
      id: idRaw,
      bytes,
      contentType: mime,
    });
    if (!wrote) {
      return NextResponse.json(
        {
          error:
            "R2 binding TRAVERSE_MEDIA is not available in this environment. Paste a public image URL instead, or run on the Worker with the bucket bound.",
        },
        { status: 503 },
      );
    }

    const alt =
      String(form.get("alt") ?? "").trim() || defaultAlt(idRaw);
    const updated_at = new Date().toISOString();
    const meta: SectionHeaderMeta = {
      src: mediaSectionPath(idRaw, updated_at),
      alt,
      updated_at,
    };
    const data = await setSectionHeader(idRaw, meta);
    return NextResponse.json({ ok: true, header: data.section_headers[idRaw] });
  }

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    src?: string;
    alt?: string;
    clear?: boolean;
  } | null;

  if (!body || typeof body.id !== "string" || !isSectionHeaderId(body.id)) {
    return NextResponse.json(
      { error: "Body must include id (whats-on|sports|civic|schools|local)" },
      { status: 400 },
    );
  }

  if (body.clear) {
    await deleteSectionHeaderObject(body.id);
    const data = await setSectionHeader(body.id, null);
    return NextResponse.json({ ok: true, header: data.section_headers[body.id] });
  }

  const src = typeof body.src === "string" ? body.src.trim() : "";
  if (!src) {
    return NextResponse.json(
      { error: "Provide src URL, upload a file, or set clear:true" },
      { status: 400 },
    );
  }
  if (!/^https?:\/\//i.test(src) && !src.startsWith("/")) {
    return NextResponse.json(
      { error: "src must be https://… or a site path like /art/…" },
      { status: 400 },
    );
  }

  const alt =
    (typeof body.alt === "string" && body.alt.trim()) || defaultAlt(body.id);
  const updated_at = new Date().toISOString();
  const meta: SectionHeaderMeta = { src, alt, updated_at };
  const data = await setSectionHeader(body.id, meta);
  return NextResponse.json({ ok: true, header: data.section_headers[body.id] });
}

export async function GET(request: Request) {
  if (!(await isDeskRequestAuthed(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = await getAppData();
  return NextResponse.json({ headers: data.section_headers });
}
