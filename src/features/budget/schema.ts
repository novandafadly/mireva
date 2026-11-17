import { z } from "zod";
import { isCalendarDate } from "@/lib/dates";
import { parseRupiah } from "@/lib/money";

export const PRICING_MODES = ["fixed", "per_pax"] as const;
export const PAX_BASES = ["guest_estimate", "manual"] as const;
export const PAYMENT_KINDS = ["dp", "termin", "pelunasan", "lainnya"] as const;

const MAX_PAX = 20_000;

/** Nominal Rupiah dari teks. Kosong menjadi `emptyValue`. */
function rupiah<T extends number | null>(emptyValue: T) {
  return z
    .string()
    .trim()
    .transform((value, context) => {
      if (value === "") return emptyValue;
      const amount = parseRupiah(value);
      if (amount === null) {
        context.addIssue({ code: "custom", message: "invalid_amount" });
        return z.NEVER;
      }
      return amount;
    });
}

const optionalDate = z
  .string()
  .trim()
  .refine((value) => value === "" || isCalendarDate(value))
  .transform((value) => (value === "" ? null : value));

export const categorySchema = z.object({ name: z.string().trim().min(1).max(80) });

export const budgetItemSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    categoryId: z.uuid(),
    pricingMode: z.enum(PRICING_MODES),
    estimatedAmount: rupiah(0),
    unitPrice: rupiah(null),
    paxBasis: z.enum(["", ...PAX_BASES]),
    paxManual: z
      .string()
      .trim()
      .refine((value) => value === "" || (/^\d+$/.test(value) && Number(value) <= MAX_PAX))
      .transform((value) => (value === "" ? null : Number(value))),
    notes: z.string().trim().max(2000),
  })
  .transform((item, context) => {
    if (item.pricingMode === "fixed") {
      return { ...item, unitPrice: null, paxBasis: null, paxManual: null };
    }
    const paxBasis = item.paxBasis === "" ? "guest_estimate" : item.paxBasis;
    if (item.unitPrice === null) {
      context.addIssue({ code: "custom", message: "unit_price_required", path: ["unitPrice"] });
      return z.NEVER;
    }
    if (paxBasis === "manual" && item.paxManual === null) {
      context.addIssue({ code: "custom", message: "pax_required", path: ["paxManual"] });
      return z.NEVER;
    }
    return {
      ...item,
      estimatedAmount: 0,
      paxBasis,
      paxManual: paxBasis === "manual" ? item.paxManual : null,
    };
  });

export const paymentSchema = z.object({
  budgetItemId: z.uuid(),
  label: z.string().trim().min(1).max(120),
  kind: z.enum(PAYMENT_KINDS),
  amount: rupiah(null).refine((value): value is number => value !== null && value > 0),
  dueDate: optionalDate,
  method: z.string().trim().max(80),
  notes: z.string().trim().max(2000),
});

export const paidSchema = z.object({
  paidAt: z.string().trim().refine(isCalendarDate),
  method: z.string().trim().max(80),
});

export type BudgetItemInput = z.infer<typeof budgetItemSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
