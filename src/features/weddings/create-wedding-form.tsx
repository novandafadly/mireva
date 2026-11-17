"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CEREMONY_KEYS, CUSTOM_KEYS, DATE_MODES } from "@/features/onboarding/schema";
import { timezoneLabel, WEDDING_TIMEZONES } from "@/lib/dates";
import { createWedding } from "./actions";

const selectClass =
  "h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const choiceClass =
  "flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2 text-sm has-checked:border-primary has-checked:bg-muted";

type DateMode = (typeof DATE_MODES)[number];

export function CreateWeddingForm() {
  const t = useTranslations("weddings.create");
  const [state, formAction, pending] = useActionState(createWedding, {});
  const [dateMode, setDateMode] = useState<DateMode>("exact");
  const [customs, setCustoms] = useState<string[]>([]);

  function toggleCustom(key: string, checked: boolean) {
    setCustoms((current) => (checked ? [...current, key] : current.filter((k) => k !== key)));
  }

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 text-lg font-semibold">{t("sections.couple")}</legend>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="partnerA">{t("partnerA")}</Label>
          <Input id="partnerA" name="partnerA" className="h-11" required maxLength={80} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="partnerB">{t("partnerB")}</Label>
          <Input id="partnerB" name="partnerB" className="h-11" required maxLength={80} />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 text-lg font-semibold">{t("sections.date")}</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {DATE_MODES.map((mode) => (
            <label key={mode} className={choiceClass}>
              <input
                type="radio"
                name="dateMode"
                value={mode}
                checked={dateMode === mode}
                onChange={() => setDateMode(mode)}
              />
              {t(`dateMode.${mode}`)}
            </label>
          ))}
        </div>
        {dateMode === "exact" ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dateStart">{t("dateStart")}</Label>
            <Input id="dateStart" name="dateStart" type="date" className="h-11" required />
          </div>
        ) : null}
        {dateMode === "range" ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dateStart">{t("dateRangeStart")}</Label>
                <Input id="dateStart" name="dateStart" type="date" className="h-11" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dateEnd">{t("dateRangeEnd")}</Label>
                <Input id="dateEnd" name="dateEnd" type="date" className="h-11" required />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{t("dateRangeHint")}</p>
          </>
        ) : null}
        {dateMode === "unknown" ? (
          <p className="text-sm text-muted-foreground">{t("dateUnknownHint")}</p>
        ) : null}
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 text-lg font-semibold">{t("sections.place")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="city">{t("city")}</Label>
            <Input id="city" name="city" className="h-11" maxLength={80} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="timezone">{t("timezone")}</Label>
            <select
              id="timezone"
              name="timezone"
              className={selectClass}
              defaultValue="Asia/Jakarta"
            >
              {WEDDING_TIMEZONES.map((zone) => (
                <option key={zone} value={zone}>
                  {timezoneLabel(zone)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 text-lg font-semibold">{t("sections.ceremony")}</legend>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ceremony">{t("ceremony")}</Label>
          <select
            id="ceremony"
            name="ceremony"
            className={selectClass}
            defaultValue=""
            aria-describedby="ceremony-hint"
          >
            <option value="">{t("ceremonyOptions.none")}</option>
            {CEREMONY_KEYS.map((key) => (
              <option key={key} value={key}>
                {t(`ceremonyOptions.${key}`)}
              </option>
            ))}
          </select>
          <p id="ceremony-hint" className="text-sm text-muted-foreground">
            {t("ceremonyHint")}
          </p>
        </div>
        <div className="flex flex-col gap-2" role="group" aria-labelledby="customs-label">
          <span id="customs-label" className="text-sm font-medium">
            {t("customs")}
          </span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CUSTOM_KEYS.map((key) => {
              const checked = customs.includes(key);
              return (
                <label key={key} className={choiceClass}>
                  <input
                    type="checkbox"
                    name="customs"
                    value={key}
                    checked={checked}
                    disabled={!checked && customs.length >= 2}
                    onChange={(event) => toggleCustom(key, event.target.checked)}
                  />
                  {t(`customOptions.${key}`)}
                </label>
              );
            })}
          </div>
          <p className="text-sm text-muted-foreground">{t("customsHint")}</p>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 text-lg font-semibold">{t("sections.scale")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="guestEstimate">{t("guestEstimate")}</Label>
            <Input
              id="guestEstimate"
              name="guestEstimate"
              inputMode="numeric"
              pattern="[0-9]*"
              className="h-11"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="totalBudget">{t("totalBudget")}</Label>
            <Input
              id="totalBudget"
              name="totalBudget"
              inputMode="numeric"
              className="h-11"
              aria-describedby="budget-hint"
            />
            <p id="budget-hint" className="text-sm text-muted-foreground">
              {t("totalBudgetHint")}
            </p>
          </div>
        </div>
      </fieldset>

      {state.error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{t(`errors.${state.error}`)}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" className="h-11 w-full" disabled={pending}>
        {t("submit")}
      </Button>
    </form>
  );
}
