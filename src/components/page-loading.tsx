import { getTranslations } from "next-intl/server";

/** Fallback Suspense untuk bagian halaman yang membaca sesi. */
export async function PageLoading() {
  const t = await getTranslations("common");
  return (
    <p role="status" className="px-6 py-12 text-center text-sm text-muted-foreground">
      {t("loading")}
    </p>
  );
}
