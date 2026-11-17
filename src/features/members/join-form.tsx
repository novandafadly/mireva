"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { acceptInvite, type JoinState } from "./actions";

export function JoinForm({ token }: { token: string }) {
  const t = useTranslations("join");
  const [state, formAction, pending] = useActionState<JoinState>(
    acceptInvite.bind(null, token),
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{t(`errors.${state.error}`)}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" className="h-11 w-full" disabled={pending}>
        {t("submit")}
      </Button>
    </form>
  );
}
