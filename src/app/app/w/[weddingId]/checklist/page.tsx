import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { requireUser } from "@/features/auth/session";
import { AddItemForm } from "@/features/checklist/add-item-form";
import { ItemRow } from "@/features/checklist/item-row";
import { listChecklist } from "@/features/checklist/queries";
import { groupByStage } from "@/features/checklist/schema";
import { getDashboardWedding } from "@/features/dashboard/queries";
import { canEdit, canView } from "@/features/members/access";
import { listMembers } from "@/features/members/queries";
import { getWeddingContext } from "@/features/weddings/queries";
import { dateInZone } from "@/lib/dates";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("checklist");
  return { title: t("title") };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ChecklistPage({ params }: PageProps<"/app/w/[weddingId]/checklist">) {
  const { weddingId } = await params;
  const user = await requireUser(`/app/w/${weddingId}/checklist`);
  const context = UUID.test(weddingId) ? await getWeddingContext(weddingId, user.id) : null;
  if (!context) notFound();

  const t = await getTranslations("checklist");
  if (!canView(context, "planning")) {
    return <p className="text-muted-foreground">{t("noAccess")}</p>;
  }

  const [items, members, wedding, format] = await Promise.all([
    listChecklist(weddingId),
    listMembers(weddingId),
    getDashboardWedding(weddingId),
    getFormatter(),
  ]);
  if (!wedding) notFound();

  const editable = canEdit(context, "planning");
  const active = context.status === "active";
  const today = dateInZone(new Date(), wedding.timezone);
  const assignees = members.map((member) => ({ id: member.id, name: member.name || "?" }));
  const names = new Map(assignees.map((member) => [member.id, member.name]));
  const groups = groupByStage(items);
  const hasDrafts = items.some((item) => item.needsReview);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("lead")}</p>
      </header>

      {hasDrafts ? (
        <p className="rounded-lg border p-3 text-sm" role="note">
          {t("draftNote")}
        </p>
      ) : null}

      {editable ? <AddItemForm weddingId={weddingId} assignees={assignees} /> : null}

      {groups.length === 0 ? <p className="text-muted-foreground">{t("empty")}</p> : null}

      {groups.map((group) => (
        <section key={group.stage} className="flex flex-col gap-3" aria-labelledby={group.stage}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id={group.stage} className="text-lg font-semibold">
              {t(`stages.${group.stage}`)}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("stageProgress", { done: group.done, total: group.total })}
            </p>
          </div>
          <ul className="flex flex-col gap-3">
            {group.items.map((item) => {
              const isMine = item.assigneeMemberId === context.memberId;
              return (
                <ItemRow
                  key={item.id}
                  weddingId={weddingId}
                  item={item}
                  assignees={assignees}
                  assigneeName={
                    item.assigneeMemberId ? (names.get(item.assigneeMemberId) ?? null) : null
                  }
                  dueLabel={
                    item.dueDate
                      ? format.dateTime(new Date(`${item.dueDate}T00:00:00Z`), {
                          dateStyle: "medium",
                          timeZone: "UTC",
                        })
                      : null
                  }
                  overdue={item.dueDate !== null && item.dueDate < today}
                  canEdit={editable}
                  canSetStatus={editable || (isMine && active)}
                  isMine={isMine}
                />
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
