import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { BudgetItemRow, PaymentRow } from "./calc";

export type BudgetCategory = { id: string; name: string };
export type BudgetItem = BudgetItemRow & { notes: string };

export type Payment = PaymentRow & {
  label: string;
  kind: "dp" | "termin" | "pelunasan" | "lainnya";
  dueDate: string | null;
  paidAt: string | null;
  method: string;
  notes: string;
};

export type BudgetData = {
  categories: BudgetCategory[];
  items: BudgetItem[];
  payments: Payment[];
  totalBudget: number;
  guestEstimate: number;
};

/** Semua data anggaran satu wedding. Kosong bila tanpa izin modul budget (RLS). */
export async function getBudgetData(weddingId: string): Promise<BudgetData | null> {
  const supabase = await createClient();
  const [wedding, categories, items, payments] = await Promise.all([
    supabase
      .from("weddings")
      .select("total_budget, guest_estimate")
      .eq("id", weddingId)
      .maybeSingle(),
    supabase
      .from("budget_categories")
      .select("id, name")
      .eq("wedding_id", weddingId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("budget_items")
      .select(
        "id, category_id, name, pricing_mode, estimated_amount, unit_price, pax_basis, pax_manual, notes",
      )
      .eq("wedding_id", weddingId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("payments")
      .select("id, budget_item_id, label, kind, amount, due_date, status, paid_at, method, notes")
      .eq("wedding_id", weddingId)
      .order("due_date", { ascending: true, nullsFirst: false }),
  ]);
  const failed = wedding.error ?? categories.error ?? items.error ?? payments.error;
  if (failed) throw new Error(`Gagal memuat anggaran: ${failed.message}`);
  if (!wedding.data) return null;

  return {
    totalBudget: Number(wedding.data.total_budget),
    guestEstimate: Number(wedding.data.guest_estimate),
    categories: (categories.data ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
    })),
    items: (items.data ?? []).map((row) => ({
      id: row.id as string,
      categoryId: row.category_id as string,
      name: row.name as string,
      pricingMode: row.pricing_mode as BudgetItem["pricingMode"],
      estimatedAmount: Number(row.estimated_amount),
      unitPrice: row.unit_price === null ? null : Number(row.unit_price),
      paxBasis: (row.pax_basis as BudgetItem["paxBasis"]) ?? null,
      paxManual: (row.pax_manual as number | null) ?? null,
      notes: row.notes as string,
    })),
    payments: (payments.data ?? []).map((row) => ({
      id: row.id as string,
      budgetItemId: row.budget_item_id as string,
      label: row.label as string,
      kind: row.kind as Payment["kind"],
      amount: Number(row.amount),
      dueDate: (row.due_date as string | null) ?? null,
      status: row.status as Payment["status"],
      paidAt: (row.paid_at as string | null) ?? null,
      method: row.method as string,
      notes: row.notes as string,
    })),
  };
}
