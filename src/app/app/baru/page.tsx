import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/features/auth/session";
import { CreateWeddingForm } from "@/features/weddings/create-wedding-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("weddings.create");
  return { title: t("title") };
}

export default async function NewWeddingPage() {
  await requireUser("/app/baru");
  const t = await getTranslations("weddings.create");
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("lead")}</p>
      </header>
      <CreateWeddingForm />
    </div>
  );
}
