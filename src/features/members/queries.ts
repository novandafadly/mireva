import "server-only";
import { createClient } from "@/lib/supabase/server";
import { permissionsSchema, type MemberRole, type Permissions } from "./schema";

export type Member = {
  id: string;
  userId: string;
  role: MemberRole;
  permissions: Permissions;
  name: string;
};

export type PendingInvite = {
  id: string;
  email: string;
  role: MemberRole;
  expiresAt: string;
};

function parsePermissions(value: unknown): Permissions {
  const parsed = permissionsSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

export async function listMembers(weddingId: string): Promise<Member[]> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("wedding_members")
    .select("id, user_id, role, permissions, display_name")
    .eq("wedding_id", weddingId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Gagal memuat anggota: ${error.message}`);

  const userIds = (rows ?? []).map((row) => row.user_id as string);
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);
  if (profileError) throw new Error(`Gagal memuat profil: ${profileError.message}`);
  const names = new Map((profiles ?? []).map((p) => [p.id as string, p.full_name as string]));

  return (rows ?? []).map((row) => ({
    id: row.id as string,
    userId: row.user_id as string,
    role: row.role as MemberRole,
    permissions: parsePermissions(row.permissions),
    name: (row.display_name as string) || names.get(row.user_id as string) || "",
  }));
}

/** Undangan yang belum diterima dan belum dicabut. Hanya terlihat oleh owner (RLS). */
export async function listPendingInvites(weddingId: string): Promise<PendingInvite[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wedding_invites")
    .select("id, email, role, expires_at")
    .eq("wedding_id", weddingId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Gagal memuat undangan: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    email: row.email as string,
    role: row.role as MemberRole,
    expiresAt: row.expires_at as string,
  }));
}
