import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requestPasswordReset } from "@/features/auth/actions";
import { AuthForm } from "@/features/auth/auth-form";
import { AuthShell } from "@/features/auth/auth-shell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.forgot");
  return { title: t("title") };
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth");
  return (
    <AuthShell title={t("forgot.title")}>
      <p className="text-sm text-muted-foreground">{t("forgot.lead")}</p>
      <AuthForm action={requestPasswordReset} fields={["email"]} submitLabel={t("forgot.submit")} />
      <Link href="/masuk" className="text-sm underline underline-offset-4">
        {t("forgot.toSignIn")}
      </Link>
    </AuthShell>
  );
}
