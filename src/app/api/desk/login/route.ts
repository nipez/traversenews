import { NextResponse } from "next/server";
import {
  createDeskSession,
  getDevDeskEmail,
  getDevDeskPassword,
} from "@/lib/auth";
import { getSupabaseAnon } from "@/lib/data/supabase";
import { supabaseConfigured } from "@/lib/data/store";

function isFormPost(request: Request): boolean {
  const type = request.headers.get("content-type")?.toLowerCase() ?? "";
  return (
    type.includes("application/x-www-form-urlencoded") ||
    type.includes("multipart/form-data")
  );
}

function deskLocation(request: Request): URL {
  const url = new URL(request.url);
  if (url.hostname === "www.traverse.news") {
    return new URL("/desk", "https://traverse.news");
  }
  return new URL("/desk", request.url);
}

async function readCredentials(request: Request): Promise<{
  email: string;
  password: string;
}> {
  if (isFormPost(request)) {
    const form = await request.formData().catch(() => null);
    return {
      email: String(form?.get("email") ?? "").trim(),
      password: String(form?.get("password") ?? ""),
    };
  }
  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
  } | null;
  return {
    email: body?.email?.trim() ?? "",
    password: body?.password ?? "",
  };
}

function successResponse(request: Request, mode: "supabase" | "local") {
  if (isFormPost(request)) {
    return NextResponse.redirect(deskLocation(request), 303);
  }
  return NextResponse.json({ ok: true, mode });
}

export async function POST(request: Request) {
  const { email, password } = await readCredentials(request);

  if (supabaseConfigured()) {
    const supabase = getSupabaseAnon();
    if (!supabase) {
      return NextResponse.json({ error: "Auth unavailable" }, { status: 500 });
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    await createDeskSession();
    return successResponse(request, "supabase");
  }

  if (
    email.toLowerCase() === getDevDeskEmail().toLowerCase() &&
    password === getDevDeskPassword()
  ) {
    await createDeskSession();
    return successResponse(request, "local");
  }

  return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
}
