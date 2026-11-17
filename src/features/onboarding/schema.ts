import { z } from "zod";
import { isCalendarDate, WEDDING_TIMEZONES } from "@/lib/dates";
import { parseRupiah } from "@/lib/money";

/** Kunci adat yang bisa dipilih di wizard. Template adat menyusul di Fase 2. */
export const CUSTOM_KEYS = [
  "nasional",
  "jawa",
  "sunda",
  "minang",
  "batak",
  "bugis",
  "betawi",
  "bali",
] as const;

export const CEREMONY_KEYS = ["akad", "pemberkatan", "lainnya"] as const;
export const DATE_MODES = ["exact", "range", "unknown"] as const;

const MAX_GUEST_ESTIMATE = 20_000;

const name = z.string().trim().min(1).max(80);
const optionalDate = z
  .string()
  .trim()
  .refine((value) => value === "" || isCalendarDate(value));

const wholeNumber = (max: number) =>
  z
    .string()
    .trim()
    .transform((value, context) => {
      if (value === "") return 0;
      const number = /^\d+$/.test(value) ? Number(value) : Number.NaN;
      if (!Number.isSafeInteger(number) || number > max) {
        context.addIssue({ code: "custom", message: "invalid_number" });
        return z.NEVER;
      }
      return number;
    });

const rupiah = z
  .string()
  .trim()
  .transform((value, context) => {
    if (value === "") return 0;
    const amount = parseRupiah(value);
    if (amount === null) {
      context.addIssue({ code: "custom", message: "invalid_amount" });
      return z.NEVER;
    }
    return amount;
  });

export const wizardSchema = z
  .object({
    partnerA: name,
    partnerB: name,
    dateMode: z.enum(DATE_MODES),
    dateStart: optionalDate,
    dateEnd: optionalDate,
    city: z.string().trim().max(80),
    timezone: z.enum(WEDDING_TIMEZONES as [string, ...string[]]),
    customs: z
      .array(z.enum(CUSTOM_KEYS))
      .transform((values) => [...new Set(values)])
      .pipe(z.array(z.enum(CUSTOM_KEYS)).max(2)),
    ceremony: z.enum(["", ...CEREMONY_KEYS]).transform((value) => (value === "" ? null : value)),
    guestEstimate: wholeNumber(MAX_GUEST_ESTIMATE),
    totalBudget: rupiah,
  })
  .transform((input, context) => {
    const { dateMode, dateStart, dateEnd, ...rest } = input;
    if (dateMode === "unknown") {
      return { ...rest, dateStart: null, dateEnd: null, dateIsFinal: false };
    }
    if (dateStart === "") {
      context.addIssue({ code: "custom", message: "date_required", path: ["dateStart"] });
      return z.NEVER;
    }
    if (dateMode === "exact") {
      return { ...rest, dateStart, dateEnd: null, dateIsFinal: true };
    }
    if (dateEnd === "" || dateEnd < dateStart) {
      context.addIssue({ code: "custom", message: "date_range_invalid", path: ["dateEnd"] });
      return z.NEVER;
    }
    return { ...rest, dateStart, dateEnd, dateIsFinal: false };
  });

export type WizardInput = z.infer<typeof wizardSchema>;
