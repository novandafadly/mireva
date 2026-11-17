"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";

export type CreateWeddingState = { error?: "invalidInput" | "generic" };

const createWeddingSchema = z.object({
  partnerA: z.string().trim().min(1).max(80),
  partnerB: z.string().trim().min(1).max(80),
});

/**
 * Pembuatan wedding minimal. Wizard lengkap (tanggal, kota, adat, anggaran,
 * rencana otomatis) menggantikan formulir ini di modul 1.2.
 */
export async function createWedding(
  _state: CreateWeddingState,
  formData: FormData,
): Promise<CreateWeddingState> {
  await requireUser("/app/baru");
  const parsed = createWeddingSchema.safeParse({
    partnerA: formData.get("partnerA"),
    partnerB: formData.get("partnerB"),
  });
  if (!parsed.success) return { error: "invalidInput" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_wedding", {
    p_display_name: `${parsed.data.partnerA} & ${parsed.data.partnerB}`,
    p_partner_a_name: parsed.data.partnerA,
    p_partner_b_name: parsed.data.partnerB,
  });
  if (error || typeof data !== "string") return { error: "generic" };

  redirect(`/app/w/${data}/pengaturan/anggota`);
}
