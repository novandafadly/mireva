"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { deleteRundownItem, updateRundownItem, type RundownActionState } from "./actions";
import { RundownFields } from "./item-fields";
import type { RundownItem, RundownSession } from "./schema";

export function RundownRow({
  weddingId,
  item,
  sessions,
  clock,
  startsAtLocal,
  canEdit,
}: {
  weddingId: string;
  item: RundownItem;
  sessions: RundownSession[];
  /** Jam yang sudah diformat di zona wedding, atau null. */
  clock: string | null;
  startsAtLocal: string | undefined;
  canEdit: boolean;
}) {
  const t = useTranslations("rundown");
  const [editState, editAction, saving] = useActionState<RundownActionState, FormData>(
    updateRundownItem.bind(null, weddingId, item.id),
    {},
  );
  const [deleteState, deleteAction, deleting] = useActionState<RundownActionState>(
    deleteRundownItem.bind(null, weddingId, item.id),
    {},
  );
  const error = editState.error ?? deleteState.error;

  return (
    <li className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
        <p className="shrink-0 text-sm font-medium tabular-nums sm:w-28">
          {clock ?? <span className="text-muted-foreground">{t("noTime")}</span>}
        </p>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-medium">{item.title}</p>
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {item.durationMin !== null ? (
              <span>{t("duration", { minutes: item.durationMin })}</span>
            ) : null}
            {item.picText ? <span>{t("pic", { name: item.picText })}</span> : null}
            {item.location ? <span>{t("location", { place: item.location })}</span> : null}
          </p>
          {item.notes ? <p className="text-sm">{item.notes}</p> : null}
        </div>
      </div>

      {canEdit ? (
        <details>
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">
            {t("edit")}
          </summary>
          <div className="flex flex-col gap-4 pt-2">
            <form action={editAction} className="flex flex-col gap-4">
              <RundownFields
                idPrefix={`edit-${item.id}`}
                item={item}
                startsAtLocal={startsAtLocal}
                sessions={sessions}
              />
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
