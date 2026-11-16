import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";

/** Klien Supabase untuk komponen klien. Memakai sesi pengguna, RLS berlaku. */
export function createClient() {
  const env = publicEnv();
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
