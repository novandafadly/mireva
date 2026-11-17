import { addDays, startOfDayInZone, type WeddingTimezone } from "@/lib/dates";
import { allocateByBasisPoints } from "@/lib/money";
import {
  adminDocsTemplate,
  BUDGET_TEMPLATE,
  CHECKLIST_TEMPLATE,
  sessionTemplates,
  STAGE_OFFSET_DAYS,
  STAGE_ORDER,
  type Ceremony,
  type ChecklistStage,
} from "@/templates/general";

/**
 * Generator rencana awal: berbasis aturan, dari template umum (SPEC 6.1).
 * Fungsi murni supaya mudah diuji. Hasilnya dikirim ke `create_wedding()`
 * dan disimpan dalam satu transaksi.
 */

export type PlanInput = {
  /** Tanggal acara, atau awal rentang bila belum pasti. Null bila belum ada. */
  dateStart: string | null;
  ceremony: Ceremony | null;
  timezone: WeddingTimezone;
  totalBudget: number;
  /** Tanggal hari ini di zona wedding. */
  today: string;
};

export type PlanSession = {
  kind: "akad" | "pemberkatan" | "resepsi";
  name: string;
  startsAt: string | null;
  endsAt: string | null;
  sortOrder: number;
};

export type PlanChecklistItem = {
  stage: ChecklistStage;
  kind: "general" | "admin_docs";
  title: string;
  description: string;
  dueDate: string | null;
  templateKey: string;
  needsReview: boolean;
  sortOrder: number;
};

export type PlanRundownItem = {
  sessionSortOrder: number;
  title: string;
  startsAt: string | null;
  durationMin: number;
  templateKey: string;
  sortOrder: number;
};

export type PlanBudgetCategory = {
  name: string;
  templateKey: string;
  amount: number;
  sortOrder: number;
};

export type Plan = {
  sessions: PlanSession[];
  checklist: PlanChecklistItem[];
  rundown: PlanRundownItem[];
  budget: PlanBudgetCategory[];
};

const MS_PER_MINUTE = 60_000;

function dueDate(input: PlanInput, stage: ChecklistStage): string | null {
  if (!input.dateStart) return null;
  const due = addDays(input.dateStart, -STAGE_OFFSET_DAYS[stage]);
  // Tugas yang tenggatnya sudah lewat saat wedding dibuat jatuh tempo hari ini.
  return due < input.today ? input.today : due;
}

function buildChecklist(input: PlanInput): PlanChecklistItem[] {
  const general = CHECKLIST_TEMPLATE.map((item) => ({ ...item, kind: "general" as const }));
  const admin = adminDocsTemplate(input.ceremony).map((item) => ({
    ...item,
    kind: "admin_docs" as const,
  }));

  return [...general, ...admin]
    .map((item, index) => ({ item, index }))
    .sort(
      (a, b) =>
        STAGE_ORDER.indexOf(a.item.stage) - STAGE_ORDER.indexOf(b.item.stage) || a.index - b.index,
    )
    .map(({ item }, sortOrder) => ({
      stage: item.stage,
      kind: item.kind,
      title: item.title,
      description: item.description ?? "",
      dueDate: dueDate(input, item.stage),
      templateKey: item.key,
      needsReview: item.kind === "admin_docs",
      sortOrder,
    }));
}

function buildSessionsAndRundown(input: PlanInput): Pick<Plan, "sessions" | "rundown"> {
  const dayStart = input.dateStart
    ? startOfDayInZone(input.dateStart, input.timezone).getTime()
    : null;
  const at = (minute: number) =>
    dayStart === null ? null : new Date(dayStart + minute * MS_PER_MINUTE).toISOString();

  const sessions: PlanSession[] = [];
  const rundown: PlanRundownItem[] = [];

  sessionTemplates(input.ceremony).forEach((template, sessionSortOrder) => {
    sessions.push({
      kind: template.kind,
      name: template.name,
      startsAt: at(template.startMinute),
      endsAt: at(template.startMinute + template.durationMin),
      sortOrder: sessionSortOrder,
    });
    for (const item of template.rundown) {
      rundown.push({
        sessionSortOrder,
        title: item.title,
        startsAt: at(template.startMinute + item.offsetMin),
        durationMin: item.durationMin,
        templateKey: item.key,
        sortOrder: rundown.length,
      });
    }
  });

  return { sessions, rundown };
}

function buildBudget(input: PlanInput): PlanBudgetCategory[] {
  const amounts = allocateByBasisPoints(
    input.totalBudget,
    BUDGET_TEMPLATE.map((category) => category.shareBp),
  );
  return BUDGET_TEMPLATE.map((category, sortOrder) => ({
    name: category.name,
    templateKey: category.key,
    amount: amounts[sortOrder]!,
    sortOrder,
  }));
}

export function buildPlan(input: PlanInput): Plan {
  return {
    ...buildSessionsAndRundown(input),
    checklist: buildChecklist(input),
    budget: buildBudget(input),
  };
}
