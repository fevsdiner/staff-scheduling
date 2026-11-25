import { createClient } from "@supabase/supabase-js";

import { readEnv } from "@/lib/env";
import { isSupabaseConfigured } from "@/lib/supabase/client";

/** Server-only client. The service role bypasses RLS. Never import from client components. */
export function isSupabaseAdminConfigured(): boolean {
  return isSupabaseConfigured() && Boolean(readEnv("SUPABASE_SERVICE_ROLE_KEY"));
}

export function createSupabaseAdminClient() {
  const supabaseUrl = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase service role is not configured. Set SUPABASE_SERVICE_ROLE_KEY. The anon key cannot read or write tables after RLS is enabled.",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
