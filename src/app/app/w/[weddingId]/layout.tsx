import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function WeddingLayout({
  children,
  params,
}: LayoutProps<"/app/w/[weddingId]">) {
  const [{ weddingId }, t] = await Promise.all([params, getTranslations("nav")]);
  const base = `/app/w/${weddingId}`;
  const links = [
    { href: `${base}/dasbor`, label: t("dashboard") },
    { href: `${base}/checklist`, label: t("checklist") },
    { href: `${base}/rundown`, label: t("rundown") },
    { href: `${base}/pengaturan/anggota`, label: t("members") },
    { href: "/app", label: t("weddings") },
  ];
  return (
    <div className="flex flex-col gap-8">
      <nav aria-label={t("label")} className="-mx-1 flex flex-wrap gap-1 border-b pb-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium hover:bg-muted"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
