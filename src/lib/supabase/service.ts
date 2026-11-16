import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";

/**
 * Klien service role: MELEWATI RLS.
 *
 * Hanya untuk tiga jalur di D-005: Route Handler tamu dan crew (setelah token
 * divalidasi dan rate limit diterapkan), cron, dan webhook. Jangan dipakai di
 * Server Component atau Server Action milik pengguna login.
 */
export function createServiceClient() {
  const env = serverEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
