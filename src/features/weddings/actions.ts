"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/features/auth/session";
import { buildPlan } from "@/features/onboarding/plan";
import { wizardSchema } from "@/features/onboarding/schema";
import { dateInZone, type WeddingTimezone } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export type CreateWeddingState = { error?: "invalidInput" | "generic" };

/**
 * Wizard onboarding: menyimpan wedding beserta rencana awal dari template umum
 * dalam satu transaksi (SPEC 6.1), lalu membuka dasbor.
 */
export async function createWedding(
  _state: CreateWeddingState,
  formData: FormData,
): Promise<CreateWeddingState> {
  await requireUser("/app/baru");

  const text = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };
  const parsed = wizardSchema.safeParse({
    partnerA: text("partnerA"),
    partnerB: text("partnerB"),
    dateMode: text("dateMode"),
    dateStart: text("dateStart"),
    dateEnd: text("dateEnd"),
    city: text("city"),
    timezone: text("timezone"),
    customs: formData.getAll("customs"),
    ceremony: text("ceremony"),
    guestEstimate: text("guestEstimate"),
    totalBudget: text("totalBudget"),
  });
  if (!parsed.success) return { error: "invalidInput" };
  const input = parsed.data;
  const timezone = input.timezone as WeddingTimezone;

  const plan = buildPlan({
    dateStart: input.dateStart,
    ceremony: input.ceremony,
    timezone,
    totalBudget: input.totalBudget,
    today: dateInZone(new Date(), timezone),
  });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_wedding", {
    p_display_name: `${input.partnerA} & ${input.partnerB}`,
    p_partner_a_name: input.partnerA,
    p_partner_b_name: input.partnerB,
    p_date_start: input.dateStart,
    p_date_end: input.dateEnd,
    p_date_is_final: input.dateIsFinal,
    p_city: input.city,
    p_timezone: timezone,
    p_customs: input.customs,
    p_guest_estimate: input.guestEstimate,
    p_total_budget: input.totalBudget,
    p_ceremony_type: input.ceremony,
    p_plan: {
      sessions: plan.sessions.map((session) => ({
        kind: session.kind,
        name: session.name,
        starts_at: session.startsAt,
        ends_at: session.endsAt,
        sort_order: session.sortOrder,
      })),
      checklist: plan.checklist.map((item) => ({
        stage: item.stage,
        kind: item.kind,
        title: item.title,
        description: item.description,
        due_date: item.dueDate,
        template_key: item.templateKey,
        needs_review: item.needsReview,
        sort_order: item.sortOrder,
      })),
      rundown: plan.rundown.map((item) => ({
        session_sort_order: item.sessionSortOrder,
        title: item.title,
        starts_at: item.startsAt,
        duration_min: item.durationMin,
        template_key: item.templateKey,
        sort_order: item.sortOrder,
      })),
      budget: plan.budget.map((category) => ({
        name: category.name,
        template_key: category.templateKey,
        amount: category.amount,
        sort_order: category.sortOrder,
      })),
    },
  });
  if (error || typeof data !== "string") return { error: "generic" };

  redirect(`/app/w/${data}/dasbor`);
}
