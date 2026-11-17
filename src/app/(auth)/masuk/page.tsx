import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signIn } from "@/features/auth/actions";
import { AuthForm } from "@/features/auth/auth-form";
import { AuthShell } from "@/features/auth/auth-shell";
import { GoogleButton } from "@/features/auth/google-button";
import { safeNextPath } from "@/lib/redirects";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.signIn");
  return { title: t("title") };
}

export default async function SignInPage({ searchParams }: PageProps<"/masuk">) {
  const params = await searchParams;
  const nextPath = safeNextPath(params.lanjut);
  const t = await getTranslations("auth");
  const linkError = params.galat === "tautan";
  const next = `?lanjut=${encodeURIComponent(nextPath)}`;

  return (
    <AuthShell title={t("signIn.title")}>
      {params.galat ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>
            {t(linkError ? "errors.linkInvalid" : "errors.generic")}
          </AlertDescription>
        </Alert>
      ) : null}
      <AuthForm
        action={signIn}
        fields={["email", "password"]}
        submitLabel={t("signIn.submit")}
        nextPath={nextPath}
      />
      <p className="text-center text-sm text-muted-foreground">{t("or")}</p>
      <GoogleButton nextPath={nextPath} />
      <div className="flex flex-col gap-2 text-sm">
        <Link href="/lupa-sandi" className="underline underline-offset-4">
          {t("signIn.forgot")}
        </Link>
        <p>
          {t("signIn.noAccount")}{" "}
          <Link href={`/daftar${next}`} className="underline underline-offset-4">
            {t("signIn.toSignUp")}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
