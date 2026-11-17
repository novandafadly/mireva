import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { requireUser } from "@/features/auth/session";
import {
  getDashboardWedding,
  listBudgetEstimates,
  listChecklistRows,
} from "@/features/dashboard/queries";
import { checklistProgress, focusThisWeek } from "@/features/dashboard/summary";
import { getWeddingContext } from "@/features/weddings/queries";
import { dateInZone, daysUntil } from "@/lib/dates";
import { formatRupiah, sumRupiah } from "@/lib/money";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return { title: t("title") };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function DashboardPage({ params }: PageProps<"/app/w/[weddingId]/dasbor">) {
  const { weddingId } = await params;
  const user = await requireUser(`/app/w/${weddingId}/dasbor`);
  const context = UUID.test(weddingId) ? await getWeddingContext(weddingId, user.id) : null;
  if (!context) notFound();

  const [wedding, checklist, estimates, t, format] = await Promise.all([
    getDashboardWedding(weddingId),
    listChecklistRows(weddingId),
    listBudgetEstimates(weddingId),
    getTranslations("dashboard"),
    getFormatter(),
  ]);
  if (!wedding) notFound();

  const now = new Date();
  const today = dateInZone(now, wedding.timezone);
  const formatDate = (date: string) =>
    format.dateTime(new Date(`${date}T00:00:00Z`), { dateStyle: "long", timeZone: "UTC" });

  const daysLeft = wedding.dateStart ? daysUntil(wedding.dateStart, now, wedding.timezone) : null;
  const progress = checklistProgress(checklist);
  const focus = focusThisWeek(checklist, today);
  const allocated = sumRupiah(estimates);
  const remaining = wedding.totalBudget - allocated;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{context.displayName}</h1>
        {context.status === "archived" ? (
          <p className="text-sm text-muted-foreground">{t("archived")}</p>
        ) : null}
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="flex flex-col gap-1 rounded-lg border p-4" aria-labelledby="countdown">
          <h2 id="countdown" className="text-sm font-medium text-muted-foreground">
            {t("countdown.label")}
          </h2>
          {daysLeft === null ? (
            <p className="text-xl font-semibold">{t("countdown.unset")}</p>
          ) : (
            <>
              <p className="text-3xl font-semibold tracking-tight">
                {daysLeft < 0 ? t("countdown.past") : t("countdown.days", { days: daysLeft })}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatDate(wedding.dateStart!)}
                {wedding.dateIsFinal ? "" : ` · ${t("countdown.estimate")}`}
              </p>
            </>
          )}
        </section>

        <section className="flex flex-col gap-2 rounded-lg border p-4" aria-labelledby="progress">
          <h2 id="progress" className="text-sm font-medium text-muted-foreground">
            {t("checklist.label")}
          </h2>
          {progress.total === 0 ? (
            <p className="text-sm">{t("checklist.empty")}</p>
          ) : (
            <>
              <p className="text-3xl font-semibold tracking-tight">{progress.percent}%</p>
              <div
                role="progressbar"
                aria-labelledby="progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress.percent}
                className="h-2 overflow-hidden rounded-full bg-muted"
              >
                <div className="h-full bg-primary" style={{ width: `${progress.percent}%` }} />
              </div>
              <p className="text-sm text-muted-foreground">
                {t("checklist.value", { done: progress.done, total: progress.total })}
              </p>
            </>
          )}
        </section>
      </div>

      <section className="flex flex-col gap-3 rounded-lg border p-4" aria-labelledby="budget">
        <h2 id="budget" className="text-sm font-medium text-muted-foreground">
          {t("budget.label")}
        </h2>
        {wedding.totalBudget === 0 && allocated === 0 ? (
          <p className="text-sm">{t("budget.unset")}</p>
        ) : (
          <dl className="grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-muted-foreground">{t("budget.total")}</dt>
              <dd className="text-lg font-semibold tabular-nums">
                {formatRupiah(wedding.totalBudget)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">{t("budget.allocated")}</dt>
              <dd className="text-lg font-semibold tabular-nums">{formatRupiah(allocated)}</dd>
            </div>
            {remaining >= 0 ? (
              <div>
                <dt className="text-sm text-muted-foreground">{t("budget.remaining")}</dt>
                <dd className="text-lg font-semibold tabular-nums">{formatRupiah(remaining)}</dd>
              </div>
            ) : null}
          </dl>
        )}
        {remaining < 0 ? (
          <p role="alert" className="text-sm text-destructive">
            {t("budget.over", { amount: formatRupiah(-remaining) })}
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="focus">
        <h2 id="focus" className="text-lg font-semibold">
          {t("focus.label")}
        </h2>
        {focus.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("focus.empty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {focus.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border p-3"
              >
                <span>{item.title}</span>
                <span
                  className={
                    item.overdue ? "text-sm text-destructive" : "text-sm text-muted-foreground"
                  }
                >
                  {item.overdue ? `${t("focus.overdue")} · ` : ""}
                  {t("focus.due", { date: formatDate(item.dueDate) })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
