import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";

/**
 * Klien Supabase dengan sesi pengguna (D-003). RLS berlaku penuh.
 * Buat klien baru di setiap request, jangan dibagikan antar request.
 */
export async function createClient() {
  const env = publicEnv();
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component tidak bisa menulis cookie. Penyegaran sesi
            // ditangani proxy (ditambahkan bersama modul auth).
          }
        },
      },
    },
  );
}
