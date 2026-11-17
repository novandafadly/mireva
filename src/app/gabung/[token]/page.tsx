import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { PageLoading } from "@/components/page-loading";
import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/actions";
import { AuthShell } from "@/features/auth/auth-shell";
import { requireUser } from "@/features/auth/session";
import { JoinForm } from "@/features/members/join-form";

export const metadata: Metadata = { robots: { index: false } };

export default function JoinPage(props: PageProps<"/gabung/[token]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Join {...props} />
    </Suspense>
  );
}

async function Join({ params }: PageProps<"/gabung/[token]">) {
  const { token } = await params;
  // Bergabung adalah perubahan data, jadi tidak dilakukan saat halaman dibuka:
  // pengguna harus menekan tombol (pemindai link di email tidak ikut memicunya).
  const user = await requireUser(`/gabung/${token}`);
  const t = await getTranslations();

  return (
    <AuthShell title={t("join.title")}>
      <p>{t("join.lead")}</p>
      {user.email ? (
        <p className="text-sm text-muted-foreground">
          {t("join.signedInAs", { email: user.email })}
        </p>
      ) : null}
      <JoinForm token={token} />
      <form action={signOut} className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">{t("join.switchAccount")}</p>
        <Button type="submit" variant="outline" className="h-11 w-full">
          {t("auth.signOut")}
        </Button>
      </form>
    </AuthShell>
  );
}
