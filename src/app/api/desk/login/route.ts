import { NextResponse } from "next/server";
import {
  createDeskSession,
  getDevDeskEmail,
  getDevDeskPassword,
} from "@/lib/auth";
import { getSupabaseAnon } from "@/lib/data/supabase";
import { supabaseConfigured } from "@/lib/data/store";
import { getSite, isSiteAllowed, siteOrigin } from "@/lib/sites";

function isFormPost(request: Request): boolean {
  const type = request.headers.get("content-type")?.toLowerCase() ?? "";
  return (
    type.includes("application/x-www-form-urlencoded") ||
    type.includes("multipart/form-data")
  );
}

function apexOrigin(request: Request): string {
  const url = new URL(request.url);
  const site = getSite();
  const host = site.hostname.replace(/^www\./, "");
  if (url.hostname === `www.${host}` || url.hostname === host) {
    return siteOrigin();
  }
  return url.origin;
}

function deskLocation(request: Request): URL {
  return new URL("/desk", apexOrigin(request));
}

function loginLocation(request: Request, error?: string): URL {
  const url = new URL("/desk/login", apexOrigin(request));
  if (error) url.searchParams.set("error", error);
  return url;
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

function failureResponse(request: Request, message: string, status: number) {
  if (isFormPost(request)) {
    // Full navigation back to the login page — never a raw JSON blob in the browser.
    return NextResponse.redirect(loginLocation(request, message), 303);
  }
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  if (!isSiteAllowed()) {
    return failureResponse(request, "This city is not on your staff list", 403);
  }
  const { email, password } = await readCredentials(request);

  if (supabaseConfigured()) {
    const supabase = getSupabaseAnon();
    if (!supabase) {
      return failureResponse(request, "Auth unavailable", 500);
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return failureResponse(request, "Invalid email or password", 401);
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

  return failureResponse(request, "Invalid email or password", 401);
}
