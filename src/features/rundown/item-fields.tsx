import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RundownItem, RundownSession } from "./schema";

const fieldClass =
  "rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/** Kolom formulir acara rundown, dipakai untuk tambah dan ubah. */
export function RundownFields({
  idPrefix,
  item,
  startsAtLocal,
  sessions,
  defaultSessionId,
}: {
  idPrefix: string;
  item?: RundownItem;
  /** Nilai datetime-local di zona wedding. */
  startsAtLocal?: string;
  sessions: RundownSession[];
  defaultSessionId?: string;
}) {
  const t = useTranslations("rundown");
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-title`}>{t("fields.title")}</Label>
        <Input
          id={`${idPrefix}-title`}
          name="title"
          className="h-11"
          required
          maxLength={200}
          defaultValue={item?.title}
        />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-session`}>{t("fields.session")}</Label>
        <select
          id={`${idPrefix}-session`}
          name="eventSessionId"
          className={`${fieldClass} h-11`}
          defaultValue={item?.eventSessionId ?? defaultSessionId ?? ""}
        >
          <option value="">{t("fields.noSession")}</option>
          {sessions.map((session) => (
            <option key={session.id} value={session.id}>
              {session.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-starts`}>{t("fields.startsAt")}</Label>
        <Input
          id={`${idPrefix}-starts`}
          name="startsAt"
          type="datetime-local"
          className="h-11"
          defaultValue={startsAtLocal ?? ""}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-duration`}>{t("fields.durationMin")}</Label>
        <Input
          id={`${idPrefix}-duration`}
          name="durationMin"
          inputMode="numeric"
          pattern="[0-9]*"
          className="h-11"
          defaultValue={item?.durationMin ?? ""}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-pic`}>{t("fields.picText")}</Label>
        <Input
          id={`${idPrefix}-pic`}
          name="picText"
          className="h-11"
          maxLength={120}
          defaultValue={item?.picText}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-location`}>{t("fields.location")}</Label>
        <Input
          id={`${idPrefix}-location`}
          name="location"
          className="h-11"
          maxLength={200}
          defaultValue={item?.location}
        />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-notes`}>{t("fields.notes")}</Label>
        <textarea
          id={`${idPrefix}-notes`}
          name="notes"
          rows={2}
          maxLength={2000}
          className={`${fieldClass} py-2`}
          defaultValue={item?.notes}
        />
      </div>
    </div>
  );
}
