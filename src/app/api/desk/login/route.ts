import { NextResponse } from "next/server";
import {
  createDeskSession,
  getDevDeskEmail,
  getDevDeskPassword,
} from "@/lib/auth";
import { getSupabaseAnon } from "@/lib/data/supabase";
import { supabaseConfigured } from "@/lib/data/store";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
  } | null;

  const email = body?.email?.trim() ?? "";
  const password = body?.password ?? "";

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
    return NextResponse.json({ ok: true, mode: "supabase" });
  }

  if (
    email.toLowerCase() === getDevDeskEmail().toLowerCase() &&
    password === getDevDeskPassword()
  ) {
    await createDeskSession();
    return NextResponse.json({ ok: true, mode: "local" });
  }

  return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
}
