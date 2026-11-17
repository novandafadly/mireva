"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";
import { budgetItemSchema, categorySchema, paidSchema, paymentSchema } from "./schema";

export type BudgetActionState = {
  error?: "invalidInput" | "forbidden" | "duplicate" | "hasPayments" | "generic";
};

const idSchema = z.uuid();
const validIds = (...ids: string[]) => ids.every((id) => idSchema.safeParse(id).success);

function revalidate(weddingId: string) {
  revalidatePath(`/app/w/${weddingId}/anggaran`);
  revalidatePath(`/app/w/${weddingId}/anggaran/pembayaran`);
  revalidatePath(`/app/w/${weddingId}/dasbor`);
}

function errorKey(error: { code?: string }): BudgetActionState["error"] {
  if (error.code === "42501") return "forbidden";
  if (error.code === "23505") return "duplicate";
  // FK dari payments: item atau kategori masih punya pembayaran.
  if (error.code === "23503") return "hasPayments";
  if (error.code === "23514") return "invalidInput";
  return "generic";
}

const text = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
};

/** Hasil tulis: galat database, atau nol baris (disaring RLS) berarti tidak berizin. */
function result(
  weddingId: string,
  response: { data: unknown[] | null; error: { code?: string } | null },
): BudgetActionState {
  if (response.error) return { error: errorKey(response.error) };
  if (!response.data?.length) return { error: "forbidden" };
  revalidate(weddingId);
  return {};
}

// --- Kategori -------------------------------------------------------------

export async function addCategory(
  weddingId: string,
  _state: BudgetActionState,
  formData: FormData,
): Promise<BudgetActionState> {
  await requireUser();
  const parsed = categorySchema.safeParse({ name: text(formData, "name") });
  if (!validIds(weddingId) || !parsed.success) return { error: "invalidInput" };

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("budget_categories")
    .select("sort_order")
    .eq("wedding_id", weddingId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  return result(
    weddingId,
    await supabase
      .from("budget_categories")
      .insert({
        wedding_id: weddingId,
        name: parsed.data.name,
        sort_order: ((last?.sort_order as number | undefined) ?? -1) + 1,
      })
      .select("id"),
  );
}

export async function renameCategory(
  weddingId: string,
  categoryId: string,
  _state: BudgetActionState,
  formData: FormData,
): Promise<BudgetActionState> {
  await requireUser();
  const parsed = categorySchema.safeParse({ name: text(formData, "name") });
  if (!validIds(weddingId, categoryId) || !parsed.success) return { error: "invalidInput" };

  const supabase = await createClient();
  return result(
    weddingId,
    await supabase
      .from("budget_categories")
      .update({ name: parsed.data.name })
      .eq("id", categoryId)
      .eq("wedding_id", weddingId)
      .select("id"),
  );
}

export async function deleteCategory(
  weddingId: string,
  categoryId: string,
  _state: BudgetActionState,
): Promise<BudgetActionState> {
  await requireUser();
  if (!validIds(weddingId, categoryId)) return { error: "invalidInput" };

  const supabase = await createClient();
  return result(
    weddingId,
    await supabase
      .from("budget_categories")
      .delete()
      .eq("id", categoryId)
      .eq("wedding_id", weddingId)
      .select("id"),
  );
}

// --- Item -----------------------------------------------------------------

function itemFromForm(formData: FormData) {
  const parsed = budgetItemSchema.safeParse({
    name: text(formData, "name"),
    categoryId: text(formData, "categoryId"),
    pricingMode: text(formData, "pricingMode"),
    estimatedAmount: text(formData, "estimatedAmount"),
    unitPrice: text(formData, "unitPrice"),
    paxBasis: text(formData, "paxBasis"),
    paxManual: text(formData, "paxManual"),
    notes: text(formData, "notes"),
  });
  if (!parsed.success) return null;
  return {
    name: parsed.data.name,
    category_id: parsed.data.categoryId,
    pricing_mode: parsed.data.pricingMode,
    estimated_amount: parsed.data.estimatedAmount,
    unit_price: parsed.data.unitPrice,
    pax_basis: parsed.data.paxBasis,
    pax_manual: parsed.data.paxManual,
    notes: parsed.data.notes,
  };
}

export async function addBudgetItem(
  weddingId: string,
  _state: BudgetActionState,
  formData: FormData,
): Promise<BudgetActionState> {
  await requireUser();
  const row = itemFromForm(formData);
  if (!validIds(weddingId) || !row) return { error: "invalidInput" };

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("budget_items")
    .select("sort_order")
    .eq("wedding_id", weddingId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  return result(
    weddingId,
    await supabase
      .from("budget_items")
      .insert({
        ...row,
        wedding_id: weddingId,
        sort_order: ((last?.sort_order as number | undefined) ?? -1) + 1,
      })
      .select("id"),
  );
}

export async function updateBudgetItem(
  weddingId: string,
  itemId: string,
  _state: BudgetActionState,
  formData: FormData,
): Promise<BudgetActionState> {
  await requireUser();
  const row = itemFromForm(formData);
  if (!validIds(weddingId, itemId) || !row) return { error: "invalidInput" };

  const supabase = await createClient();
  return result(
    weddingId,
    await supabase
      .from("budget_items")
      .update(row)
      .eq("id", itemId)
      .eq("wedding_id", weddingId)
      .select("id"),
  );
}

export async function deleteBudgetItem(
  weddingId: string,
  itemId: string,
  _state: BudgetActionState,
): Promise<BudgetActionState> {
  await requireUser();
  if (!validIds(weddingId, itemId)) return { error: "invalidInput" };

  const supabase = await createClient();
  return result(
    weddingId,
    await supabase
      .from("budget_items")
      .delete()
      .eq("id", itemId)
      .eq("wedding_id", weddingId)
      .select("id"),
  );
}

// --- Pembayaran -----------------------------------------------------------

export async function addPayment(
  weddingId: string,
  _state: BudgetActionState,
  formData: FormData,
): Promise<BudgetActionState> {
  await requireUser();
  const parsed = paymentSchema.safeParse({
    budgetItemId: text(formData, "budgetItemId"),
    label: text(formData, "label"),
    kind: text(formData, "kind"),
    amount: text(formData, "amount"),
    dueDate: text(formData, "dueDate"),
    method: text(formData, "method"),
    notes: text(formData, "notes"),
  });
  if (!validIds(weddingId) || !parsed.success) return { error: "invalidInput" };

  const supabase = await createClient();
  const response = await supabase
    .from("payments")
    .insert({
      wedding_id: weddingId,
      budget_item_id: parsed.data.budgetItemId,
      label: parsed.data.label,
      kind: parsed.data.kind,
      amount: parsed.data.amount,
      due_date: parsed.data.dueDate,
      method: parsed.data.method,
      notes: parsed.data.notes,
    })
    .select("id");
  // Di sini 23503 berarti item anggaran bukan milik wedding ini.
  if (response.error?.code === "23503") return { error: "invalidInput" };
  return result(weddingId, response);
}

export async function markPaymentPaid(
  weddingId: string,
  paymentId: string,
  _state: BudgetActionState,
  formData: FormData,
): Promise<BudgetActionState> {
  await requireUser();
  const parsed = paidSchema.safeParse({
    paidAt: text(formData, "paidAt"),
    method: text(formData, "method"),
  });
  if (!validIds(weddingId, paymentId) || !parsed.success) return { error: "invalidInput" };

  const supabase = await createClient();
  return result(
    weddingId,
    await supabase
      .from("payments")
      .update({ status: "paid", paid_at: parsed.data.paidAt, method: parsed.data.method })
      .eq("id", paymentId)
      .eq("wedding_id", weddingId)
      .select("id"),
  );
}

/** Membatalkan pembayaran, atau menjadwalkannya lagi. Keduanya mengosongkan tanggal bayar. */
export async function setPaymentStatus(
  weddingId: string,
  paymentId: string,
  status: "scheduled" | "cancelled",
  _state: BudgetActionState,
): Promise<BudgetActionState> {
  await requireUser();
  if (!validIds(weddingId, paymentId) || !["scheduled", "cancelled"].includes(status)) {
    return { error: "invalidInput" };
  }

  const supabase = await createClient();
  return result(
    weddingId,
    await supabase
      .from("payments")
      .update({ status, paid_at: null })
      .eq("id", paymentId)
      .eq("wedding_id", weddingId)
      .select("id"),
  );
}

export async function deletePayment(
  weddingId: string,
  paymentId: string,
  _state: BudgetActionState,
): Promise<BudgetActionState> {
  await requireUser();
  if (!validIds(weddingId, paymentId)) return { error: "invalidInput" };

  const supabase = await createClient();
  return result(
    weddingId,
    await supabase
      .from("payments")
      .delete()
      .eq("id", paymentId)
      .eq("wedding_id", weddingId)
      .select("id"),
  );
}
