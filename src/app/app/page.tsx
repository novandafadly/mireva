import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/features/auth/session";
import { listMyWeddings } from "@/features/weddings/queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("weddings.list");
  return { title: t("title") };
}

export default async function WeddingsPage() {
  const user = await requireUser("/app");
  const [weddings, t, format] = await Promise.all([
    listMyWeddings(user.id),
    getTranslations("weddings.list"),
    getFormatter(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <Link href="/app/baru" className={buttonVariants({ className: "h-11" })}>
          {t("create")}
        </Link>
      </div>

      {weddings.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {weddings.map((wedding) => (
            <li key={wedding.id}>
              <Link
                href={`/app/w/${wedding.id}/pengaturan/anggota`}
                className="flex flex-col gap-1 rounded-lg border p-4 hover:bg-muted"
              >
                <span className="font-medium">{wedding.displayName}</span>
                <span className="text-sm text-muted-foreground">
                  {wedding.dateStart
                    ? format.dateTime(new Date(`${wedding.dateStart}T00:00:00Z`), {
                        dateStyle: "long",
                        timeZone: "UTC",
                      })
                    : t("dateUnset")}
                  {" · "}
                  {t(wedding.role === "owner" ? "roleOwner" : "roleCollaborator")}
                  {wedding.status === "archived" ? ` · ${t("archived")}` : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
