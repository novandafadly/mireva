import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { RundownItem, RundownSession } from "./schema";

export async function listSessions(weddingId: string): Promise<RundownSession[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_sessions")
    .select("id, name, sort_order")
    .eq("wedding_id", weddingId)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`Gagal memuat sesi: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    sortOrder: row.sort_order as number,
  }));
}

/** Kosong bila pengguna tidak punya izin modul planning (RLS menyaring). */
export async function listRundown(weddingId: string): Promise<RundownItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rundown_items")
    .select(
      "id, event_session_id, title, starts_at, duration_min, pic_text, location, notes, sort_order",
    )
    .eq("wedding_id", weddingId);
  if (error) throw new Error(`Gagal memuat rundown: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    eventSessionId: (row.event_session_id as string | null) ?? null,
    title: row.title as string,
    startsAt: row.starts_at ? new Date(row.starts_at as string).toISOString() : null,
    durationMin: (row.duration_min as number | null) ?? null,
    picText: row.pic_text as string,
    location: row.location as string,
    notes: row.notes as string,
    sortOrder: row.sort_order as number,
  }));
}
