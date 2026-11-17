import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SessionUser = { id: string; email: string | null };

/** Pengguna dari JWT yang sudah diverifikasi, atau null bila tidak ada sesi. */
export async function getUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
}

/** Untuk halaman dan action yang wajib login. */
export async function requireUser(nextPath?: string): Promise<SessionUser> {
  const user = await getUser();
  if (!user) {
    redirect(nextPath ? `/masuk?lanjut=${encodeURIComponent(nextPath)}` : "/masuk");
  }
  return user;
}
