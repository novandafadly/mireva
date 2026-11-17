import { describe, expect, it } from "vitest";
import { itemEstimate, summarizeBudget, type BudgetItemRow, type PaymentRow } from "./calc";

const item = (overrides: Partial<BudgetItemRow>): BudgetItemRow => ({
  id: "i1",
  categoryId: "c1",
  name: "Item",
  pricingMode: "fixed",
  estimatedAmount: 0,
  unitPrice: null,
  paxBasis: null,
  paxManual: null,
  ...overrides,
});

const payment = (overrides: Partial<PaymentRow>): PaymentRow => ({
  id: "p1",
  budgetItemId: "i1",
  amount: 0,
  status: "scheduled",
  ...overrides,
});

const categories = [
  { id: "c1", name: "Katering" },
  { id: "c2", name: "Dekorasi" },
];

describe("itemEstimate", () => {
  it("item tetap memakai estimasinya", () => {
    expect(itemEstimate(item({ estimatedAmount: 25_000_000 }), 300)).toBe(25_000_000);
  });

  it("item per orang = harga satuan × perkiraan tamu", () => {
    const perPax = item({ pricingMode: "per_pax", unitPrice: 85_000, paxBasis: "guest_estimate" });
    expect(itemEstimate(perPax, 300)).toBe(25_500_000);
  });

  it("basis manual memakai jumlah yang diisi", () => {
    const perPax = item({
      pricingMode: "per_pax",
      unitPrice: 10_000,
      paxBasis: "manual",
      paxManual: 50,
    });
    expect(itemEstimate(perPax, 300)).toBe(500_000);
  });

  it("basis RSVP memakai perkiraan tamu sampai simulasi tersedia", () => {
    const perPax = item({ pricingMode: "per_pax", unitPrice: 10_000, paxBasis: "rsvp" });
    expect(itemEstimate(perPax, 200)).toBe(2_000_000);
  });

  it("item per orang tanpa harga satuan bernilai nol", () => {
    expect(itemEstimate(item({ pricingMode: "per_pax", paxBasis: "guest_estimate" }), 300)).toBe(0);
  });
});

describe("summarizeBudget", () => {
  const items = [
    item({ id: "i1", categoryId: "c1", estimatedAmount: 60_000_000 }),
    item({ id: "i2", categoryId: "c2", estimatedAmount: 20_000_000 }),
    item({ id: "i3", categoryId: "c2", estimatedAmount: 5_000_000 }),
  ];
  const payments = [
    payment({ id: "p1", budgetItemId: "i1", amount: 15_000_000, status: "paid" }),
    payment({ id: "p2", budgetItemId: "i1", amount: 30_000_000, status: "scheduled" }),
    payment({ id: "p3", budgetItemId: "i1", amount: 9_000_000, status: "cancelled" }),
    payment({ id: "p4", budgetItemId: "i2", amount: 25_000_000, status: "scheduled" }),
  ];
  const summary = summarizeBudget({
    categories,
    items,
    payments,
    totalBudget: 100_000_000,
    guestEstimate: 300,
  });

  it("realisasi hanya menghitung pembayaran lunas", () => {
    expect(summary.totals.realized).toBe(15_000_000);
  });

  it("terikat menghitung terjadwal dan lunas, tanpa yang dibatalkan", () => {
    expect(summary.totals.committed).toBe(70_000_000);
  });

  it("estimasi kategori adalah jumlah estimasi itemnya", () => {
    expect(summary.categories.map((c) => c.estimate)).toEqual([60_000_000, 25_000_000]);
    expect(summary.totals.estimate).toBe(85_000_000);
  });

  it("persentase terpakai = realisasi ÷ estimasi, dibulatkan ke bawah", () => {
    expect(summary.categories[0]!.percentUsed).toBe(25);
    expect(summary.totals.percentUsed).toBe(17);
  });

  it("item over budget bila terikat melebihi estimasi", () => {
    const decor = summary.categories[1]!;
    expect(decor.items.find((i) => i.id === "i2")!.over).toBe(true);
    expect(decor.items.find((i) => i.id === "i3")!.over).toBe(false);
    expect(summary.categories[0]!.items[0]!.over).toBe(false);
  });

  it("kategori dinilai dari jumlahnya sendiri, bukan dari itemnya", () => {
    // Dekorasi: terikat 25 juta dari estimasi 25 juta. Belum lewat walau satu item lewat.
    expect(summary.categories[1]!.over).toBe(false);
    expect(summary.categories[1]!.overBy).toBe(0);
  });

  it("melaporkan selisih over budget", () => {
    const decorItem = summary.categories[1]!.items.find((i) => i.id === "i2")!;
    expect(decorItem.overBy).toBe(5_000_000);
  });

  it("total over budget bila terikat melebihi total anggaran", () => {
    expect(summary.totals.over).toBe(false);
    const tight = summarizeBudget({
      categories,
      items,
      payments,
      totalBudget: 60_000_000,
      guestEstimate: 300,
    });
    expect(tight.totals.over).toBe(true);
    expect(tight.totals.overBy).toBe(10_000_000);
  });

  it("menandai rencana yang melebihi total anggaran", () => {
    expect(summary.totals.planOverBy).toBe(0);
    const tight = summarizeBudget({
      categories,
      items,
      payments: [],
      totalBudget: 80_000_000,
      guestEstimate: 300,
    });
    expect(tight.totals.planOverBy).toBe(5_000_000);
  });

  it("estimasi nol menghasilkan persentase null, bukan pembagian nol", () => {
    const empty = summarizeBudget({
      categories,
      items: [item({ estimatedAmount: 0 })],
      payments: [payment({ amount: 1000, status: "paid" })],
      totalBudget: 0,
      guestEstimate: 0,
    });
    expect(empty.categories[0]!.percentUsed).toBeNull();
    expect(empty.totals.percentUsed).toBeNull();
    expect(empty.categories[0]!.items[0]!.over).toBe(true);
  });

  it("kategori tanpa item tetap muncul dengan nilai nol", () => {
    const summaryEmpty = summarizeBudget({
      categories,
      items: [],
      payments: [],
      totalBudget: 0,
      guestEstimate: 0,
    });
    expect(summaryEmpty.categories).toHaveLength(2);
    expect(summaryEmpty.categories[0]).toMatchObject({ estimate: 0, realized: 0, committed: 0 });
  });

  it("total anggaran nol tidak dianggap over budget", () => {
    const noTotal = summarizeBudget({
      categories,
      items,
      payments,
      totalBudget: 0,
      guestEstimate: 0,
    });
    expect(noTotal.totals.over).toBe(false);
    expect(noTotal.totals.planOverBy).toBe(0);
  });
});
