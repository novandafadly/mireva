import { z } from "zod";
import { isCalendarDate } from "@/lib/dates";
import { STAGE_ORDER, type ChecklistStage } from "@/templates/general";

export const STATUSES = ["todo", "in_progress", "done", "skipped"] as const;
export const statusSchema = z.enum(STATUSES);
export type ChecklistStatus = (typeof STATUSES)[number];

const emptyToNull = (value: string) => (value === "" ? null : value);

export const checklistItemSchema = z.object({
  title: z.string().trim().min(1).max(200),
  stage: z.enum(STAGE_ORDER as [ChecklistStage, ...ChecklistStage[]]),
  description: z.string().trim().max(2000),
  notes: z.string().trim().max(2000),
  dueDate: z
    .string()
    .trim()
    .refine((value) => value === "" || isCalendarDate(value))
    .transform(emptyToNull),
  assigneeMemberId: z
    .string()
    .trim()
    .refine((value) => value === "" || z.uuid().safeParse(value).success)
    .transform(emptyToNull),
});

export type ChecklistItemInput = z.infer<typeof checklistItemSchema>;

export type ChecklistItem = {
  id: string;
  stage: ChecklistStage;
  kind: "general" | "admin_docs" | "adat";
  title: string;
  description: string;
  notes: string;
  status: ChecklistStatus;
  dueDate: string | null;
  assigneeMemberId: string | null;
  needsReview: boolean;
  sortOrder: number;
};

export type StageGroup = {
  stage: ChecklistStage;
  items: ChecklistItem[];
  done: number;
  total: number;
};

/** Tugas per tahap, dari tahap paling awal. Tahap tanpa tugas dilewatkan. */
export function groupByStage(items: readonly ChecklistItem[]): StageGroup[] {
  return STAGE_ORDER.flatMap((stage) => {
    const inStage = items
      .filter((item) => item.stage === stage)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    if (inStage.length === 0) return [];
    const counted = inStage.filter((item) => item.status !== "skipped");
    return [
      {
        stage,
        items: inStage,
        done: counted.filter((item) => item.status === "done").length,
        total: counted.length,
      },
    ];
  });
}
