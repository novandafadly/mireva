import { getTranslations } from "next-intl/server";
import { brand } from "@/config/brand";

export default async function HomePage() {
  const t = await getTranslations("home");
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-3 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title", { brand: brand.name })}</h1>
      <p className="text-base leading-relaxed">{t("lead")}</p>
      <p className="text-sm opacity-70">{t("status")}</p>
    </main>
  );
}
