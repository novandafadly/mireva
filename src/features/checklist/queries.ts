import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ChecklistItem } from "./schema";

/** Kosong bila pengguna tidak punya izin modul planning (RLS menyaring). */
export async function listChecklist(weddingId: string): Promise<ChecklistItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checklist_items")
    .select(
      "id, stage, kind, title, description, notes, status, due_date, assignee_member_id, needs_review, sort_order",
    )
    .eq("wedding_id", weddingId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Gagal memuat checklist: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    stage: row.stage as ChecklistItem["stage"],
    kind: row.kind as ChecklistItem["kind"],
    title: row.title as string,
    description: row.description as string,
    notes: row.notes as string,
    status: row.status as ChecklistItem["status"],
    dueDate: (row.due_date as string | null) ?? null,
    assigneeMemberId: (row.assignee_member_id as string | null) ?? null,
    needsReview: row.needs_review as boolean,
    sortOrder: row.sort_order as number,
  }));
}
