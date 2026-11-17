import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getNow, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/features/auth/session";
import { revokeInvite } from "@/features/members/actions";
import { InviteForm } from "@/features/members/invite-form";
import { MemberControls } from "@/features/members/member-controls";
import { listMembers, listPendingInvites } from "@/features/members/queries";
import { PHASE_ONE_MODULE_KEYS } from "@/features/members/schema";
import { getWeddingContext } from "@/features/weddings/queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("members");
  return { title: t("title") };
}

export default async function MembersPage({
  params,
}: PageProps<"/app/w/[weddingId]/pengaturan/anggota">) {
  const { weddingId } = await params;
  const path = `/app/w/${weddingId}/pengaturan/anggota`;
  const user = await requireUser(path);

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(weddingId);
  const wedding = isUuid ? await getWeddingContext(weddingId, user.id) : null;
  if (!wedding) notFound();

  const canManage = wedding.role === "owner" && wedding.status === "active";
  const [members, invites, t, format, now] = await Promise.all([
    listMembers(weddingId),
    canManage ? listPendingInvites(weddingId) : Promise.resolve([]),
    getTranslations("members"),
    getFormatter(),
    getNow(),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{wedding.displayName}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("lead")}</p>
      </header>

      <ul className="flex flex-col gap-4">
        {members.map((member) => (
          <li key={member.id} className="flex flex-col gap-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium">
                {member.name || t(`roles.${member.role}`)}
                {member.userId === user.id ? ` (${t("you")})` : ""}
              </span>
              <span className="text-sm text-muted-foreground">{t(`roles.${member.role}`)}</span>
            </div>
            {member.role === "owner" ? (
              <p className="text-sm text-muted-foreground">{t("ownerAccess")}</p>
            ) : canManage ? (
              <MemberControls
                weddingId={weddingId}
                memberId={member.id}
                name={member.name || t("roles.collaborator")}
                permissions={member.permissions}
              />
            ) : (
              <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                {PHASE_ONE_MODULE_KEYS.map((key) => (
                  <div key={key} className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{t(`modules.${key}`)}</dt>
                    <dd>{t(`levels.${member.permissions[key] ?? "none"}`)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </li>
        ))}
      </ul>

      {canManage ? (
        <>
          <section className="flex flex-col gap-4" aria-labelledby="pending-title">
            <h2 id="pending-title" className="text-lg font-semibold">
              {t("pending.title")}
            </h2>
            {invites.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("pending.empty")}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {invites.map((invite) => {
                  const expiresAt = new Date(invite.expiresAt);
                  return (
                    <li
                      key={invite.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
                    >
                      <div className="flex min-w-0 flex-col">
                        <span className="font-medium break-all">{invite.email}</span>
                        <span className="text-sm text-muted-foreground">
                          {t(`roles.${invite.role}`)}
                          {" · "}
                          {expiresAt <= now
                            ? t("pending.expired")
                            : t("pending.expires", {
                                date: format.dateTime(expiresAt, { dateStyle: "medium" }),
                              })}
                        </span>
                      </div>
                      <form action={revokeInvite.bind(null, weddingId, invite.id)}>
                        <Button type="submit" variant="outline" className="h-11">
                          {t("pending.revoke")}
                        </Button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-4" aria-labelledby="invite-title">
            <h2 id="invite-title" className="text-lg font-semibold">
              {t("invite.title")}
            </h2>
            <InviteForm weddingId={weddingId} />
          </section>
        </>
      ) : null}
    </div>
  );
}
