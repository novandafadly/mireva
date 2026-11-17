import { useTranslations } from "next-intl";
import { ACCESS_LEVELS, PHASE_ONE_MODULE_KEYS, type Permissions } from "./schema";

/** Satu pilihan izin per modul. Nama kolom: `perm_<modul>`. */
export function PermissionFields({
  idPrefix,
  defaults = {},
  disabled = false,
}: {
  idPrefix: string;
  defaults?: Permissions;
  disabled?: boolean;
}) {
  const t = useTranslations("members");
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {PHASE_ONE_MODULE_KEYS.map((key) => {
        const id = `${idPrefix}-${key}`;
        return (
          <div key={key} className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-sm font-medium">
              {t(`modules.${key}`)}
            </label>
            <select
              id={id}
              name={`perm_${key}`}
              defaultValue={defaults[key] ?? "none"}
              disabled={disabled}
              className="h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
            >
              {ACCESS_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {t(`levels.${level}`)}
                </option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}
