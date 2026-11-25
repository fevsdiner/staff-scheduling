import { readEnv } from "@/lib/env";

export function isSupabaseConfigured(): boolean {
  return Boolean(
    readEnv("NEXT_PUBLIC_SUPABASE_URL") && readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}
