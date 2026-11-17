import { percentUsed, sumRupiah } from "@/lib/money";

/**
 * Perhitungan anggaran (SPEC 4.1, "Rumus"). Semua nominal Rupiah integer.
 *
 * - Estimasi  = jumlah estimasi item; item per orang = harga satuan × jumlah orang.
 * - Realisasi = pembayaran berstatus lunas.
 * - Terikat   = pembayaran terjadwal + lunas.
 * - Over budget bila terikat > estimasi (item, kategori) atau > total anggaran.
 */

export type BudgetItemRow = {
  id: string;
  categoryId: string;
  name: string;
  pricingMode: "fixed" | "per_pax";
  estimatedAmount: number;
  unitPrice: number | null;
  paxBasis: "guest_estimate" | "rsvp" | "manual" | null;
  paxManual: number | null;
};

export type PaymentRow = {
  id: string;
  budgetItemId: string;
  amount: number;
  status: "scheduled" | "paid" | "cancelled";
};

export type Amounts = {
  estimate: number;
  realized: number;
  committed: number;
  /** Null bila estimasi nol. */
  percentUsed: number | null;
  over: boolean;
  overBy: number;
};

export type ItemSummary = BudgetItemRow & Amounts;
export type CategorySummary = { id: string; name: string; items: ItemSummary[] } & Amounts;

export type BudgetSummary = {
  categories: CategorySummary[];
  totals: Amounts & {
    totalBudget: number;
    /** Selisih bila jumlah estimasi melebihi total anggaran. */
    planOverBy: number;
  };
};

/** Estimasi satu item. Basis RSVP memakai perkiraan tamu sampai simulasi ada (Fase 2). */
export function itemEstimate(item: BudgetItemRow, guestEstimate: number): number {
  if (item.pricingMode === "fixed") return item.estimatedAmount;
  const pax = item.paxBasis === "manual" ? (item.paxManual ?? 0) : guestEstimate;
  return (item.unitPrice ?? 0) * pax;
}

function amounts(estimate: number, realized: number, committed: number, limit = estimate): Amounts {
  const overBy = Math.max(0, committed - limit);
  return {
    estimate,
    realized,
    committed,
    percentUsed: percentUsed(realized, estimate),
    over: overBy > 0,
    overBy,
  };
}

export function summarizeBudget(input: {
  categories: readonly { id: string; name: string }[];
  items: readonly BudgetItemRow[];
  payments: readonly PaymentRow[];
  totalBudget: number;
  guestEstimate: number;
}): BudgetSummary {
  const paid = new Map<string, number>();
  const committed = new Map<string, number>();
  for (const payment of input.payments) {
    if (payment.status === "cancelled") continue;
    committed.set(
      payment.budgetItemId,
      (committed.get(payment.budgetItemId) ?? 0) + payment.amount,
    );
    if (payment.status === "paid") {
      paid.set(payment.budgetItemId, (paid.get(payment.budgetItemId) ?? 0) + payment.amount);
    }
  }

  const categories = input.categories.map((category) => {
    const items = input.items
      .filter((item) => item.categoryId === category.id)
      .map((item) => ({
        ...item,
        ...amounts(
          itemEstimate(item, input.guestEstimate),
          paid.get(item.id) ?? 0,
          committed.get(item.id) ?? 0,
        ),
      }));
    return {
      id: category.id,
      name: category.name,
      items,
      ...amounts(
        sumRupiah(items.map((item) => item.estimate)),
        sumRupiah(items.map((item) => item.realized)),
        sumRupiah(items.map((item) => item.committed)),
      ),
    };
  });

  const estimate = sumRupiah(categories.map((category) => category.estimate));
  const realized = sumRupiah(categories.map((category) => category.realized));
  const totalCommitted = sumRupiah(categories.map((category) => category.committed));
  const hasTotal = input.totalBudget > 0;

  return {
    categories,
    totals: {
      // Tanpa total anggaran, tidak ada batas untuk dilampaui.
      ...amounts(estimate, realized, totalCommitted, hasTotal ? input.totalBudget : totalCommitted),
      totalBudget: input.totalBudget,
      planOverBy: hasTotal ? Math.max(0, estimate - input.totalBudget) : 0,
    },
  };
}
