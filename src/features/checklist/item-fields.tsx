import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STAGE_ORDER } from "@/templates/general";
import type { ChecklistItem } from "./schema";

export type AssigneeOption = { id: string; name: string };

export const fieldClass =
  "rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/** Kolom formulir tugas, dipakai untuk tambah dan ubah. */
export function ItemFields({
  idPrefix,
  item,
  assignees,
}: {
  idPrefix: string;
  item?: ChecklistItem;
  assignees: AssigneeOption[];
}) {
  const t = useTranslations("checklist");
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-title`}>{t("fields.title")}</Label>
        <Input
          id={`${idPrefix}-title`}
          name="title"
          className="h-11"
          required
          maxLength={200}
          defaultValue={item?.title}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-stage`}>{t("fields.stage")}</Label>
        <select
          id={`${idPrefix}-stage`}
          name="stage"
          className={`${fieldClass} h-11`}
          defaultValue={item?.stage ?? "m1"}
        >
          {STAGE_ORDER.map((stage) => (
            <option key={stage} value={stage}>
              {t(`stages.${stage}`)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-due`}>{t("fields.dueDate")}</Label>
        <Input
          id={`${idPrefix}-due`}
          name="dueDate"
          type="date"
          className="h-11"
          defaultValue={item?.dueDate ?? ""}
        />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-assignee`}>{t("fields.assignee")}</Label>
        <select
          id={`${idPrefix}-assignee`}
          name="assigneeMemberId"
          className={`${fieldClass} h-11`}
          defaultValue={item?.assigneeMemberId ?? ""}
        >
          <option value="">{t("fields.unassigned")}</option>
          {assignees.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-description`}>{t("fields.description")}</Label>
        <textarea
          id={`${idPrefix}-description`}
          name="description"
          rows={2}
          maxLength={2000}
          className={`${fieldClass} py-2`}
          defaultValue={item?.description}
        />
      </div>
      <input type="hidden" name="notes" value={item?.notes ?? ""} />
    </div>
  );
}
