"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { addRundownItem, type RundownActionState } from "./actions";
import { RundownFields } from "./item-fields";
import type { RundownSession } from "./schema";

export function AddRundownItemForm({
  weddingId,
  sessions,
}: {
  weddingId: string;
  sessions: RundownSession[];
}) {
  const t = useTranslations("rundown");
  const [state, formAction, pending] = useActionState<RundownActionState, FormData>(
    addRundownItem.bind(null, weddingId),
    {},
  );
  return (
    <details className="rounded-lg border">
      <summary className="flex min-h-11 cursor-pointer items-center px-4 font-medium">
        {t("add")}
      </summary>
      <form action={formAction} className="flex flex-col gap-4 border-t p-4">
        <RundownFields idPrefix="new-rundown" sessions={sessions} />
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
