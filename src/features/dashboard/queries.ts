import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { WeddingTimezone } from "@/lib/dates";
import type { ChecklistRow } from "./summary";

export type DashboardWedding = {
  dateStart: string | null;
  dateIsFinal: boolean;
  timezone: WeddingTimezone;
  totalBudget: number;
};

export async function getDashboardWedding(weddingId: string): Promise<DashboardWedding | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("weddings")
    .select("date_start, date_is_final, timezone, total_budget")
    .eq("id", weddingId)
    .maybeSingle();
  if (error) throw new Error(`Gagal memuat wedding: ${error.message}`);
  if (!data) return null;
  return {
    dateStart: (data.date_start as string | null) ?? null,
    dateIsFinal: data.date_is_final as boolean,
    timezone: data.timezone as WeddingTimezone,
    totalBudget: Number(data.total_budget),
  };
}

/** Kosong bila pengguna tidak punya izin modul planning (RLS menyaring). */
export async function listChecklistRows(weddingId: string): Promise<ChecklistRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checklist_items")
    .select("id, title, status, due_date")
    .eq("wedding_id", weddingId);
  if (error) throw new Error(`Gagal memuat checklist: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    status: row.status as ChecklistRow["status"],
    dueDate: (row.due_date as string | null) ?? null,
  }));
}

/** Estimasi item berharga tetap. Item per orang dihitung di modul anggaran (1.4). */
export async function listBudgetEstimates(weddingId: string): Promise<number[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("budget_items")
    .select("estimated_amount")
    .eq("wedding_id", weddingId)
    .eq("pricing_mode", "fixed");
  if (error) throw new Error(`Gagal memuat anggaran: ${error.message}`);
  return (data ?? []).map((row) => Number(row.estimated_amount));
}
