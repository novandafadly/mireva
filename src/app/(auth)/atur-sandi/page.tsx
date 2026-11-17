import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { updatePassword } from "@/features/auth/actions";
import { AuthForm } from "@/features/auth/auth-form";
import { AuthShell } from "@/features/auth/auth-shell";
import { requireUser } from "@/features/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.reset");
  return { title: t("title") };
}

export default async function ResetPasswordPage() {
  // Link pemulihan sudah membuat sesi lewat /auth/callback.
  await requireUser("/atur-sandi");
  const t = await getTranslations("auth");
  return (
    <AuthShell title={t("reset.title")}>
      <AuthForm
        action={updatePassword}
        fields={["newPassword"]}
        submitLabel={t("reset.submit")}
        hint={t("signUp.passwordHint")}
      />
    </AuthShell>
  );
}
