"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { addChecklistItem, type ChecklistActionState } from "./actions";
import { ItemFields, type AssigneeOption } from "./item-fields";

export function AddItemForm({
  weddingId,
  assignees,
}: {
  weddingId: string;
  assignees: AssigneeOption[];
}) {
  const t = useTranslations("checklist");
  const [state, formAction, pending] = useActionState<ChecklistActionState, FormData>(
    addChecklistItem.bind(null, weddingId),
    {},
  );
  return (
    <details className="rounded-lg border">
      <summary className="flex min-h-11 cursor-pointer items-center px-4 font-medium">
        {t("add")}
      </summary>
      <form action={formAction} className="flex flex-col gap-4 border-t p-4">
        <ItemFields idPrefix="new-item" assignees={assignees} />
        {state.error ? (
          <p role="alert" className="text-sm text-destructive">
            {t(`errors.${state.error}`)}
          </p>
        ) : null}
        <Button type="submit" className="h-11 sm:self-start" disabled={pending}>
          {t("addSubmit")}
        </Button>
      </form>
    </details>
  );
}
