import { addDays } from "@/lib/dates";

export type ChecklistRow = {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done" | "skipped";
  dueDate: string | null;
};

export type ChecklistProgress = { done: number; total: number; percent: number };

/** Progres checklist. Tugas yang dilewati tidak dihitung. */
export function checklistProgress(items: readonly ChecklistRow[]): ChecklistProgress {
  const counted = items.filter((item) => item.status !== "skipped");
  const done = counted.filter((item) => item.status === "done").length;
  const total = counted.length;
  return { done, total, percent: total === 0 ? 0 : Math.floor((done * 100) / total) };
}

export type FocusItem = ChecklistRow & { dueDate: string; overdue: boolean };

/**
 * "Fokus minggu ini": tugas belum selesai yang terlambat atau jatuh tempo dalam
 * 7 hari, dari tenggat paling awal. `today` adalah tanggal di zona wedding.
 */
export function focusThisWeek(items: readonly ChecklistRow[], today: string, max = 5): FocusItem[] {
  const horizon = addDays(today, 7);
  return items
    .filter(
      (item): item is ChecklistRow & { dueDate: string } =>
        item.dueDate !== null &&
        item.dueDate <= horizon &&
        (item.status === "todo" || item.status === "in_progress"),
    )
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, max)
    .map((item) => ({ ...item, overdue: item.dueDate < today }));
}
