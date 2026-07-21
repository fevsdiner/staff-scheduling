import { createClient } from "@supabase/supabase-js";

import { readEnv } from "@/lib/env";
import { isSupabaseConfigured } from "@/lib/supabase/client";

/** Server-only client for admin writes (bypasses RLS). Never expose to the browser. */
export function isSupabaseAdminConfigured(): boolean {
  return isSupabaseConfigured() && Boolean(readEnv("SUPABASE_SERVICE_ROLE_KEY"));
}

export function createSupabaseAdminClient() {
  const supabaseUrl = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase admin is not configured. Set SUPABASE_SERVICE_ROLE_KEY in the server environment.",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
