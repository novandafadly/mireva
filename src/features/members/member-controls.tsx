"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { removeMember, updateMemberPermissions, type MemberActionState } from "./actions";
import { PermissionFields } from "./permission-fields";
import type { Permissions } from "./schema";

/** Kontrol owner atas satu kolaborator: ubah izin dan keluarkan. */
export function MemberControls({
  weddingId,
  memberId,
  name,
  permissions,
}: {
  weddingId: string;
  memberId: string;
  name: string;
  permissions: Permissions;
}) {
  const t = useTranslations("members");
  const [saveState, saveAction, saving] = useActionState<MemberActionState, FormData>(
    updateMemberPermissions.bind(null, weddingId, memberId),
    {},
  );
  const [removeState, removeAction, removing] = useActionState<MemberActionState>(
    removeMember.bind(null, weddingId, memberId),
    {},
  );
  const error = saveState.error ?? removeState.error;

  return (
    <div className="flex flex-col gap-3">
      <form action={saveAction} className="flex flex-col gap-3">
        <PermissionFields idPrefix={`perm-${memberId}`} defaults={permissions} />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="outline" className="h-11" disabled={saving}>
            {t("savePermissions")}
          </Button>
          {saveState.saved ? (
            <p role="status" className="text-sm text-muted-foreground">
              {t("permissionsSaved")}
            </p>
          ) : null}
        </div>
      </form>
      <form
        action={removeAction}
        onSubmit={(event) => {
          if (!window.confirm(t("removeConfirm", { name }))) event.preventDefault();
        }}
      >
        <Button type="submit" variant="destructive" className="h-11" disabled={removing}>
          {t("remove")}
        </Button>
      </form>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {t(`errors.${error}`)}
        </p>
      ) : null}
    </div>
  );
}
