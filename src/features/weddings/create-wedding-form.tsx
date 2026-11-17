"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createWedding } from "./actions";

export function CreateWeddingForm() {
  const t = useTranslations("weddings.create");
  const [state, formAction, pending] = useActionState(createWedding, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="partnerA">{t("partnerA")}</Label>
        <Input id="partnerA" name="partnerA" className="h-11" required maxLength={80} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="partnerB">{t("partnerB")}</Label>
        <Input id="partnerB" name="partnerB" className="h-11" required maxLength={80} />
      </div>
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
