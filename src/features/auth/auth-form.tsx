"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuthFormState } from "./actions";

type Field = "fullName" | "email" | "password" | "newPassword";

const FIELD_PROPS: Record<Field, { name: string; type: string; autoComplete: string }> = {
  fullName: { name: "fullName", type: "text", autoComplete: "name" },
  email: { name: "email", type: "email", autoComplete: "email" },
  password: { name: "password", type: "password", autoComplete: "current-password" },
  newPassword: { name: "password", type: "password", autoComplete: "new-password" },
};

export function AuthForm({
  action,
  fields,
  submitLabel,
  nextPath,
  hint,
}: {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  fields: Field[];
  submitLabel: string;
  nextPath?: string;
  hint?: string;
}) {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState(action, {});

  if (state.notice) {
    return (
      <Alert role="status">
        <AlertDescription>{t(`notices.${state.notice}`)}</AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {nextPath ? <input type="hidden" name="lanjut" value={nextPath} /> : null}
      {fields.map((field) => {
        const props = FIELD_PROPS[field];
        const id = `auth-${field}`;
        const isNewPassword = field === "newPassword";
        return (
          <div key={field} className="flex flex-col gap-1.5">
            <Label htmlFor={id}>{t(`fields.${field}`)}</Label>
            <Input
              id={id}
              className="h-11"
              required
              minLength={isNewPassword ? 8 : undefined}
              aria-describedby={isNewPassword && hint ? `${id}-hint` : undefined}
              {...props}
            />
            {isNewPassword && hint ? (
              <p id={`${id}-hint`} className="text-sm text-muted-foreground">
                {hint}
              </p>
            ) : null}
          </div>
        );
      })}
      {state.error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{t(`errors.${state.error}`)}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" className="h-11 w-full" disabled={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}
