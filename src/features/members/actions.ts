"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/features/auth/session";
import { getWeddingContext } from "@/features/weddings/queries";
import { getEmailSender } from "@/lib/email";
import { memberInviteEmail } from "@/lib/email/templates";
import { assertWithinLimit, EntitlementError } from "@/lib/entitlements";
import { siteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";
import { generateToken, hashToken } from "@/lib/tokens";
import { joinErrorKey, memberErrorKey, type JoinErrorKey, type MemberErrorKey } from "./errors";
import { inviteSchema, MODULE_KEYS, permissionsSchema } from "./schema";

const idSchema = z.uuid();

function membersPath(weddingId: string): string {
  return `/app/w/${weddingId}/pengaturan/anggota`;
}

/** Membaca pilihan izin dari kolom formulir `perm_<modul>`. */
function permissionsFromForm(formData: FormData): Record<string, FormDataEntryValue> {
  const entries = MODULE_KEYS.flatMap((key) => {
    const value = formData.get(`perm_${key}`);
    return value && value !== "none" ? [[key, value] as const] : [];
  });
  return Object.fromEntries(entries);
}

export type InviteState = {
  error?: MemberErrorKey;
  created?: { link: string; email: string; emailed: boolean };
};

export async function createInvite(
  weddingId: string,
  _state: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const user = await requireUser(membersPath(weddingId));
  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
    permissions: permissionsFromForm(formData),
  });
  if (!idSchema.safeParse(weddingId).success || !parsed.success) return { error: "invalidInput" };

  const wedding = await getWeddingContext(weddingId, user.id);
  if (!wedding || wedding.role !== "owner") return { error: "forbidden" };

  const supabase = await createClient();

  if (parsed.data.role === "collaborator") {
    const { count, error: countError } = await supabase
      .from("wedding_members")
      .select("id", { count: "exact", head: true })
      .eq("wedding_id", weddingId)
      .eq("role", "collaborator");
    if (countError) return { error: "generic" };
    try {
      assertWithinLimit(wedding.entitlements, "members.max", count ?? 0);
    } catch (error) {
      if (error instanceof EntitlementError) return { error: "limitReached" };
      throw error;
    }
  }

  // Hanya hash yang disimpan (D-006). Token asli hanya ada di link.
  const token = generateToken();
  const { error } = await supabase.from("wedding_invites").insert({
    wedding_id: weddingId,
    email: parsed.data.email,
    role: parsed.data.role,
    permissions: parsed.data.permissions,
    token_hash: hashToken(token),
    invited_by: user.id,
  });
  if (error) return { error: memberErrorKey(error) };

  const link = `${await siteUrl()}/gabung/${token}`;
  let emailed = false;
  const sender = getEmailSender();
  if (sender) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    try {
      await sender.send(
        memberInviteEmail({
          to: parsed.data.email,
          inviterName: (profile?.full_name as string | undefined) || user.email || "",
          weddingName: wedding.displayName,
          link,
        }),
      );
      emailed = true;
    } catch {
      // Undangan tetap sah: owner bisa menyalin link yang ditampilkan.
    }
  }

  revalidatePath(membersPath(weddingId));
  return { created: { link, email: parsed.data.email, emailed } };
}

export type MemberActionState = { error?: MemberErrorKey; saved?: boolean };

export async function revokeInvite(weddingId: string, inviteId: string): Promise<void> {
  await requireUser(membersPath(weddingId));
  if (!idSchema.safeParse(weddingId).success || !idSchema.safeParse(inviteId).success) return;

  const supabase = await createClient();
  await supabase
    .from("wedding_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", inviteId)
    .eq("wedding_id", weddingId);
  revalidatePath(membersPath(weddingId));
}

export async function updateMemberPermissions(
  weddingId: string,
  memberId: string,
  _state: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  await requireUser(membersPath(weddingId));
  const permissions = permissionsSchema.safeParse(permissionsFromForm(formData));
  if (
    !idSchema.safeParse(weddingId).success ||
    !idSchema.safeParse(memberId).success ||
    !permissions.success
  ) {
    return { error: "invalidInput" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wedding_members")
    .update({ permissions: permissions.data })
    .eq("id", memberId)
    .eq("wedding_id", weddingId)
    .eq("role", "collaborator")
    .select("id");
  if (error) return { error: memberErrorKey(error) };
  // RLS menyaring baris tanpa galat: nol baris berarti pemanggil bukan owner.
  if (!data?.length) return { error: "forbidden" };

  revalidatePath(membersPath(weddingId));
  return { saved: true };
}

export async function removeMember(
  weddingId: string,
  memberId: string,
  _state: MemberActionState,
): Promise<MemberActionState> {
  await requireUser(membersPath(weddingId));
  if (!idSchema.safeParse(weddingId).success || !idSchema.safeParse(memberId).success) {
    return { error: "invalidInput" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wedding_members")
    .delete()
    .eq("id", memberId)
    .eq("wedding_id", weddingId)
    .select("id");
  if (error) return { error: memberErrorKey(error) };
  if (!data?.length) return { error: "forbidden" };

  revalidatePath(membersPath(weddingId));
  return {};
}

export type JoinState = { error?: JoinErrorKey };

/** Menerima undangan. Token dari link di-hash di server sebelum dicocokkan. */
export async function acceptInvite(token: string, _state: JoinState): Promise<JoinState> {
  await requireUser(`/gabung/${token}`);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_wedding_invite", {
    p_token_hash: hashToken(token),
  });
  if (error || typeof data !== "string") return { error: joinErrorKey(error) };

  redirect(membersPath(data));
}
