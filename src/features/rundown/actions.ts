"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/features/auth/session";
import { getDashboardWedding } from "@/features/dashboard/queries";
import { localInputToInstant } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { rundownItemSchema } from "./schema";

export type RundownActionState = { error?: "invalidInput" | "forbidden" | "generic" };

const idSchema = z.uuid();

function rundownPath(weddingId: string): string {
  return `/app/w/${weddingId}/rundown`;
}

function errorKey(error: { code?: string }): RundownActionState["error"] {
  if (error.code === "42501") return "forbidden";
  if (error.code === "23503" || error.code === "23514") return "invalidInput";
  return "generic";
}

/** Membaca formulir dan mengubah jam lokal menjadi instant di zona wedding. */
async function rowFromForm(weddingId: string, formData: FormData) {
  const text = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };
  const parsed = rundownItemSchema.safeParse({
    title: text("title"),
    eventSessionId: text("eventSessionId"),
    startsAt: text("startsAt"),
    durationMin: text("durationMin"),
    picText: text("picText"),
    location: text("location"),
    notes: text("notes"),
  });
  if (!idSchema.safeParse(weddingId).success || !parsed.success) return null;

  let startsAt: string | null = null;
  if (parsed.data.startsAt) {
    const wedding = await getDashboardWedding(weddingId);
    if (!wedding) return null;
    startsAt = localInputToInstant(parsed.data.startsAt, wedding.timezone);
    if (!startsAt) return null;
  }

  return {
    title: parsed.data.title,
    event_session_id: parsed.data.eventSessionId,
    starts_at: startsAt,
    duration_min: parsed.data.durationMin,
    pic_text: parsed.data.picText,
    location: parsed.data.location,
    notes: parsed.data.notes,
  };
}

export async function addRundownItem(
  weddingId: string,
  _state: RundownActionState,
  formData: FormData,
): Promise<RundownActionState> {
  await requireUser(rundownPath(weddingId));
  const row = await rowFromForm(weddingId, formData);
  if (!row) return { error: "invalidInput" };

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("rundown_items")
    .select("sort_order")
    .eq("wedding_id", weddingId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("rundown_items").insert({
    ...row,
    wedding_id: weddingId,
    sort_order: ((last?.sort_order as number | undefined) ?? -1) + 1,
  });
  if (error) return { error: errorKey(error) };

  revalidatePath(rundownPath(weddingId));
  return {};
}

export async function updateRundownItem(
  weddingId: string,
  itemId: string,
  _state: RundownActionState,
  formData: FormData,
): Promise<RundownActionState> {
  await requireUser(rundownPath(weddingId));
  const row = await rowFromForm(weddingId, formData);
  if (!row || !idSchema.safeParse(itemId).success) return { error: "invalidInput" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rundown_items")
    .update(row)
    .eq("id", itemId)
    .eq("wedding_id", weddingId)
    .select("id");
  if (error) return { error: errorKey(error) };
  if (!data?.length) return { error: "forbidden" };

  revalidatePath(rundownPath(weddingId));
  return {};
}

export async function deleteRundownItem(
  weddingId: string,
  itemId: string,
  _state: RundownActionState,
): Promise<RundownActionState> {
  await requireUser(rundownPath(weddingId));
  if (!idSchema.safeParse(weddingId).success || !idSchema.safeParse(itemId).success) {
    return { error: "invalidInput" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rundown_items")
    .delete()
    .eq("id", itemId)
    .eq("wedding_id", weddingId)
    .select("id");
  if (error) return { error: errorKey(error) };
  if (!data?.length) return { error: "forbidden" };

  revalidatePath(rundownPath(weddingId));
  return {};
}
