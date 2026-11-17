import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { signUp } from "@/features/auth/actions";
import { AuthForm } from "@/features/auth/auth-form";
import { AuthShell } from "@/features/auth/auth-shell";
import { GoogleButton } from "@/features/auth/google-button";
import { safeNextPath } from "@/lib/redirects";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.signUp");
  return { title: t("title") };
}

export default async function SignUpPage({ searchParams }: PageProps<"/daftar">) {
  const nextPath = safeNextPath((await searchParams).lanjut);
  const t = await getTranslations("auth");

  return (
    <AuthShell title={t("signUp.title")}>
      <AuthForm
        action={signUp}
        fields={["fullName", "email", "newPassword"]}
        submitLabel={t("signUp.submit")}
        nextPath={nextPath}
        hint={t("signUp.passwordHint")}
      />
      <p className="text-center text-sm text-muted-foreground">{t("or")}</p>
      <GoogleButton nextPath={nextPath} />
      <p className="text-sm">
        {t("signUp.hasAccount")}{" "}
        <Link
          href={`/masuk?lanjut=${encodeURIComponent(nextPath)}`}
          className="underline underline-offset-4"
        >
          {t("signUp.toSignIn")}
        </Link>
      </p>
    </AuthShell>
  );
}
