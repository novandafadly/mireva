"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createInvite, type InviteState } from "./actions";
import { PermissionFields } from "./permission-fields";
import type { MemberRole } from "./schema";

export function InviteForm({ weddingId }: { weddingId: string }) {
  const t = useTranslations("members");
  const [role, setRole] = useState<MemberRole>("collaborator");
  const [state, formAction, pending] = useActionState<InviteState, FormData>(
    createInvite.bind(null, weddingId),
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="invite-email">{t("invite.email")}</Label>
        <Input
          id="invite-email"
          name="email"
          type="email"
          autoComplete="off"
          className="h-11"
          required
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">{t("invite.role")}</legend>
        {(["collaborator", "owner"] as const).map((value) => (
          <label key={value} className="flex min-h-11 items-start gap-3 rounded-lg border p-3">
            <input
              type="radio"
              name="role"
              value={value}
              checked={role === value}
              onChange={() => setRole(value)}
              className="mt-1"
            />
            <span className="flex flex-col">
              <span className="text-sm font-medium">{t(`roles.${value}`)}</span>
              <span className="text-sm text-muted-foreground">
                {t(value === "owner" ? "invite.roleOwnerHint" : "invite.roleCollaboratorHint")}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      {role === "collaborator" ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">{t("invite.permissions")}</legend>
          <PermissionFields idPrefix="invite-perm" />
        </fieldset>
      ) : null}

      {state.error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{t(`errors.${state.error}`)}</AlertDescription>
        </Alert>
      ) : null}

      {state.created ? (
        <Alert role="status">
          <AlertDescription className="flex flex-col gap-2">
            <span>{t("invite.created")}</span>
            <code className="rounded bg-muted px-2 py-1 text-xs break-all select-all">
              {state.created.link}
            </code>
            <span>
              {t(state.created.emailed ? "invite.emailed" : "invite.notEmailed", {
                email: state.created.email,
              })}
            </span>
            <span>{t("invite.expires")}</span>
          </AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" className="h-11 w-full sm:w-auto sm:self-start" disabled={pending}>
        {t("invite.submit")}
      </Button>
    </form>
  );
}
