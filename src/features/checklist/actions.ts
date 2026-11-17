"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";
import { checklistItemSchema, statusSchema } from "./schema";

export type ChecklistActionState = { error?: "invalidInput" | "forbidden" | "generic" };

const idSchema = z.uuid();

function checklistPath(weddingId: string): string {
  return `/app/w/${weddingId}/checklist`;
}

function itemFromForm(formData: FormData) {
  const text = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };
  return checklistItemSchema.safeParse({
    title: text("title"),
    stage: text("stage"),
    description: text("description"),
    notes: text("notes"),
    dueDate: text("dueDate"),
    assigneeMemberId: text("assigneeMemberId"),
  });
}

/** Galat RLS dan hak tabel (42501) atau FK anggota dari wedding lain (23503). */
function errorKey(error: { code?: string }): ChecklistActionState["error"] {
  if (error.code === "42501") return "forbidden";
  if (error.code === "23503" || error.code === "23514") return "invalidInput";
  return "generic";
}

export async function addChecklistItem(
  weddingId: string,
  _state: ChecklistActionState,
  formData: FormData,
): Promise<ChecklistActionState> {
  await requireUser(checklistPath(weddingId));
  const parsed = itemFromForm(formData);
  if (!idSchema.safeParse(weddingId).success || !parsed.success) return { error: "invalidInput" };

  const supabase = await createClient();
  // Tugas baru ditaruh di akhir tahapnya.
  const { data: last } = await supabase
    .from("checklist_items")
    .select("sort_order")
    .eq("wedding_id", weddingId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("checklist_items").insert({
    wedding_id: weddingId,
    title: parsed.data.title,
    stage: parsed.data.stage,
    description: parsed.data.description,
    notes: parsed.data.notes,
    due_date: parsed.data.dueDate,
    assignee_member_id: parsed.data.assigneeMemberId,
    source: "manual",
    sort_order: ((last?.sort_order as number | undefined) ?? -1) + 1,
  });
  if (error) return { error: errorKey(error) };

  revalidatePath(checklistPath(weddingId));
  return {};
}

export async function updateChecklistItem(
  weddingId: string,
  itemId: string,
  _state: ChecklistActionState,
  formData: FormData,
): Promise<ChecklistActionState> {
  await requireUser(checklistPath(weddingId));
  const parsed = itemFromForm(formData);
  if (
    !idSchema.safeParse(weddingId).success ||
    !idSchema.safeParse(itemId).success ||
    !parsed.success
  ) {
    return { error: "invalidInput" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checklist_items")
    .update({
      title: parsed.data.title,
      stage: parsed.data.stage,
      description: parsed.data.description,
      notes: parsed.data.notes,
      due_date: parsed.data.dueDate,
      assignee_member_id: parsed.data.assigneeMemberId,
    })
    .eq("id", itemId)
    .eq("wedding_id", weddingId)
    .select("id");
  if (error) return { error: errorKey(error) };
  if (!data?.length) return { error: "forbidden" };

  revalidatePath(checklistPath(weddingId));
  return {};
}

/**
 * Mengubah status dan catatan saja. Ini satu-satunya perubahan yang boleh
 * dilakukan penanggung jawab tanpa izin edit (dijaga trigger di database).
 */
export async function setChecklistStatus(
  weddingId: string,
  itemId: string,
  _state: ChecklistActionState,
  formData: FormData,
): Promise<ChecklistActionState> {
  await requireUser(checklistPath(weddingId));
  const status = statusSchema.safeParse(formData.get("status"));
  const notes = z
    .string()
    .trim()
    .max(2000)
    .safeParse(formData.get("notes") ?? "");
  if (
    !idSchema.safeParse(weddingId).success ||
    !idSchema.safeParse(itemId).success ||
    !status.success ||
    !notes.success
  ) {
    return { error: "invalidInput" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checklist_items")
    .update({ status: status.data, notes: notes.data })
    .eq("id", itemId)
    .eq("wedding_id", weddingId)
    .select("id");
  if (error) return { error: errorKey(error) };
  if (!data?.length) return { error: "forbidden" };

  revalidatePath(checklistPath(weddingId));
  revalidatePath(`/app/w/${weddingId}/dasbor`);
  return {};
}

export async function deleteChecklistItem(
  weddingId: string,
  itemId: string,
  _state: ChecklistActionState,
): Promise<ChecklistActionState> {
  await requireUser(checklistPath(weddingId));
  if (!idSchema.safeParse(weddingId).success || !idSchema.safeParse(itemId).success) {
    return { error: "invalidInput" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checklist_items")
    .delete()
    .eq("id", itemId)
    .eq("wedding_id", weddingId)
    .select("id");
  if (error) return { error: errorKey(error) };
  if (!data?.length) return { error: "forbidden" };

  revalidatePath(checklistPath(weddingId));
  return {};
}
