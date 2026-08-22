import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseConfigured } from "@/lib/data/store";

export function getSupabaseAnon(): SupabaseClient | null {
  if (!supabaseConfigured()) return null;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
