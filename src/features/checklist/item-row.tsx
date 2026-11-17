"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  deleteChecklistItem,
  setChecklistStatus,
  updateChecklistItem,
  type ChecklistActionState,
} from "./actions";
import { fieldClass, ItemFields, type AssigneeOption } from "./item-fields";
import { STATUSES, type ChecklistItem } from "./schema";

export function ItemRow({
  weddingId,
  item,
  assignees,
  assigneeName,
  dueLabel,
  overdue,
  canEdit,
  canSetStatus,
  isMine,
}: {
  weddingId: string;
  item: ChecklistItem;
  assignees: AssigneeOption[];
  assigneeName: string | null;
  dueLabel: string | null;
  overdue: boolean;
  canEdit: boolean;
  canSetStatus: boolean;
  isMine: boolean;
}) {
  const t = useTranslations("checklist");
  const [statusState, statusAction, savingStatus] = useActionState<ChecklistActionState, FormData>(
    setChecklistStatus.bind(null, weddingId, item.id),
    {},
  );
  const [editState, editAction, saving] = useActionState<ChecklistActionState, FormData>(
    updateChecklistItem.bind(null, weddingId, item.id),
    {},
  );
  const [deleteState, deleteAction, deleting] = useActionState<ChecklistActionState>(
    deleteChecklistItem.bind(null, weddingId, item.id),
    {},
  );
  const error = statusState.error ?? editState.error ?? deleteState.error;
  const finished = item.status === "done" || item.status === "skipped";

  return (
    <li className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-col gap-1">
        <p className={finished ? "font-medium text-muted-foreground line-through" : "font-medium"}>
          {item.title}
        </p>
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {!canSetStatus ? <span>{t(`statuses.${item.status}`)}</span> : null}
          {dueLabel ? (
            <span className={overdue && !finished ? "text-destructive" : undefined}>
              {overdue && !finished ? `${t("overdue")} · ` : ""}
              {t("due", { date: dueLabel })}
            </span>
          ) : null}
          {assigneeName ? <span>{t("assignee", { name: assigneeName })}</span> : null}
          {isMine ? <span className="font-medium text-foreground">{t("mine")}</span> : null}
          {item.needsReview ? (
            <span className="rounded border px-1.5 text-xs font-medium">{t("draft")}</span>
          ) : null}
        </p>
        {item.description ? <p className="text-sm">{item.description}</p> : null}
        {item.notes && !canSetStatus ? (
          <p className="text-sm text-muted-foreground">{item.notes}</p>
        ) : null}
      </div>

      {canSetStatus ? (
        <form action={statusAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`status-${item.id}`} className="text-sm font-medium">
              {t("status")}
            </label>
            <select
              id={`status-${item.id}`}
              name="status"
              defaultValue={item.status}
              className={`${fieldClass} h-11`}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(`statuses.${status}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor={`notes-${item.id}`} className="text-sm font-medium">
              {t("fields.notes")}
            </label>
            <input
              id={`notes-${item.id}`}
              name="notes"
              defaultValue={item.notes}
              maxLength={2000}
              className={`${fieldClass} h-11`}
            />
          </div>
          <Button type="submit" variant="outline" className="h-11" disabled={savingStatus}>
            {t("saveStatus")}
          </Button>
        </form>
      ) : null}

      {canEdit ? (
        <details>
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">
            {t("edit")}
          </summary>
          <div className="flex flex-col gap-4 pt-2">
            <form action={editAction} className="flex flex-col gap-4">
              <ItemFields idPrefix={`edit-${item.id}`} item={item} assignees={assignees} />
              <Button type="submit" className="h-11 sm:self-start" disabled={saving}>
                {t("save")}
              </Button>
            </form>
            <form
              action={deleteAction}
              onSubmit={(event) => {
                if (!window.confirm(t("deleteConfirm", { title: item.title }))) {
                  event.preventDefault();
                }
              }}
            >
              <Button type="submit" variant="destructive" className="h-11" disabled={deleting}>
                {t("delete")}
              </Button>
            </form>
          </div>
        </details>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {t(`errors.${error}`)}
        </p>
      ) : null}
    </li>
  );
}
