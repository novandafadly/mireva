import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/features/auth/session";
import { getDashboardWedding } from "@/features/dashboard/queries";
import { canEdit, canView } from "@/features/members/access";
import { AddRundownItemForm } from "@/features/rundown/add-item-form";
import { RundownRow } from "@/features/rundown/item-row";
import { listRundown, listSessions } from "@/features/rundown/queries";
import { groupBySession } from "@/features/rundown/schema";
import { getWeddingContext } from "@/features/weddings/queries";
import { formatClock, instantToLocalInput, timezoneLabel } from "@/lib/dates";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("rundown");
  return { title: t("title") };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function RundownPage({ params }: PageProps<"/app/w/[weddingId]/rundown">) {
  const { weddingId } = await params;
  const user = await requireUser(`/app/w/${weddingId}/rundown`);
  const context = UUID.test(weddingId) ? await getWeddingContext(weddingId, user.id) : null;
  if (!context) notFound();

  const t = await getTranslations("rundown");
  if (!canView(context, "planning")) {
    return <p className="text-muted-foreground">{t("noAccess")}</p>;
  }

  const [sessions, items, wedding] = await Promise.all([
    listSessions(weddingId),
    listRundown(weddingId),
    getDashboardWedding(weddingId),
  ]);
  if (!wedding) notFound();

  const editable = canEdit(context, "planning");
  const groups = groupBySession(sessions, items);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("lead", { zone: timezoneLabel(wedding.timezone) })}
        </p>
      </header>

      {editable ? <AddRundownItemForm weddingId={weddingId} sessions={sessions} /> : null}

      {groups.length === 0 ? <p className="text-muted-foreground">{t("empty")}</p> : null}

      {groups.map((group) => {
        const headingId = `session-${group.session?.id ?? "none"}`;
        return (
          <section key={headingId} className="flex flex-col gap-3" aria-labelledby={headingId}>
            <h2 id={headingId} className="text-lg font-semibold">
              {group.session?.name ?? t("noSession")}
            </h2>
            {group.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("emptySession")}</p>
            ) : (
              <ol className="flex flex-col gap-3">
                {group.items.map((item) => (
                  <RundownRow
                    key={item.id}
                    weddingId={weddingId}
                    item={item}
                    sessions={sessions}
                    clock={item.startsAt ? formatClock(item.startsAt, wedding.timezone) : null}
                    startsAtLocal={
                      item.startsAt
                        ? instantToLocalInput(item.startsAt, wedding.timezone)
                        : undefined
                    }
                    canEdit={editable}
                  />
                ))}
              </ol>
            )}
          </section>
        );
      })}
    </div>
  );
}
