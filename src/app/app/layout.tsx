import Link from "next/link";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { PageLoading } from "@/components/page-loading";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { signOut } from "@/features/auth/actions";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const t = await getTranslations("auth");
  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
          <Link href="/app" className="font-semibold">
            {brand.name}
          </Link>
          <form action={signOut}>
            <Button type="submit" variant="ghost" className="h-11">
              {t("signOut")}
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <Suspense fallback={<PageLoading />}>{children}</Suspense>
      </main>
    </>
  );
}
