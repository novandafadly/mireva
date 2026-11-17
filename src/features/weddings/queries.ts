import "server-only";
import { createClient } from "@/lib/supabase/server";
import { permissionsSchema, type MemberRole, type Permissions } from "@/features/members/schema";

export type WeddingSummary = {
  id: string;
  displayName: string;
  dateStart: string | null;
  status: "active" | "archived";
  role: MemberRole;
};

/** Wedding milik pengguna yang sedang login. RLS membatasi hasilnya. */
export async function listMyWeddings(userId: string): Promise<WeddingSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wedding_members")
    .select("role, weddings (id, display_name, date_start, status)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Gagal memuat wedding: ${error.message}`);

  return (data ?? []).flatMap((row) => {
    const wedding = Array.isArray(row.weddings) ? row.weddings[0] : row.weddings;
    if (!wedding) return [];
    return [
      {
        id: wedding.id as string,
        displayName: wedding.display_name as string,
        dateStart: (wedding.date_start as string | null) ?? null,
        status: wedding.status as "active" | "archived",
        role: row.role as MemberRole,
      },
    ];
  });
}

export type WeddingContext = {
  id: string;
  displayName: string;
  status: "active" | "archived";
  /** Hanya untuk diteruskan ke `src/lib/entitlements.ts`. */
  entitlements: { limits: unknown };
  role: MemberRole;
  /** Izin per modul milik pengguna. Diabaikan untuk owner. */
  permissions: Permissions;
  /** Baris `wedding_members` milik pengguna di wedding ini. */
  memberId: string;
};

/** Wedding dan peran pengguna di dalamnya, atau null bila bukan anggota. */
export async function getWeddingContext(
  weddingId: string,
  userId: string,
): Promise<WeddingContext | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wedding_members")
    .select("id, role, permissions, weddings (id, display_name, status, limits)")
    .eq("wedding_id", weddingId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Gagal memuat wedding: ${error.message}`);
  if (!data) return null;

  const wedding = Array.isArray(data.weddings) ? data.weddings[0] : data.weddings;
  if (!wedding) return null;
  const { limits, ...rest } = wedding as {
    id: string;
    display_name: string;
    status: "active" | "archived";
    limits: unknown;
  };
  return {
    id: rest.id,
    displayName: rest.display_name,
    status: rest.status,
    entitlements: { limits },
    role: data.role as MemberRole,
    permissions: permissionsSchema.safeParse(data.permissions).data ?? {},
    memberId: data.id as string,
  };
}
