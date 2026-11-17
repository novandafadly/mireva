import { describe, expect, it } from "vitest";
import { budgetItemSchema, categorySchema, paidSchema, paymentSchema } from "./schema";

const ID = "3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b";

describe("categorySchema", () => {
  it("merapikan nama", () => {
    expect(categorySchema.parse({ name: "  Katering " })).toEqual({ name: "Katering" });
  });

  it("menolak nama kosong atau terlalu panjang", () => {
    expect(categorySchema.safeParse({ name: " " }).success).toBe(false);
    expect(categorySchema.safeParse({ name: "x".repeat(81) }).success).toBe(false);
  });
});

describe("budgetItemSchema", () => {
  const fixed = {
    name: "Gedung",
    categoryId: ID,
    pricingMode: "fixed",
    estimatedAmount: "Rp25.000.000",
    unitPrice: "",
    paxBasis: "",
    paxManual: "",
    notes: "",
  };

  it("item tetap: membaca nominal dan mengosongkan kolom per orang", () => {
    expect(budgetItemSchema.parse(fixed)).toEqual({
      name: "Gedung",
      categoryId: ID,
      pricingMode: "fixed",
      estimatedAmount: 25_000_000,
      unitPrice: null,
      paxBasis: null,
      paxManual: null,
      notes: "",
    });
  });

  it("item tetap dengan estimasi kosong bernilai nol", () => {
    expect(budgetItemSchema.parse({ ...fixed, estimatedAmount: "" }).estimatedAmount).toBe(0);
  });

  it("item per orang wajib punya harga satuan", () => {
    const perPax = {
      ...fixed,
      pricingMode: "per_pax",
      estimatedAmount: "",
      paxBasis: "guest_estimate",
    };
    expect(budgetItemSchema.safeParse(perPax).success).toBe(false);
    expect(budgetItemSchema.parse({ ...perPax, unitPrice: "85.000" })).toMatchObject({
      pricingMode: "per_pax",
      estimatedAmount: 0,
      unitPrice: 85_000,
      paxBasis: "guest_estimate",
      paxManual: null,
    });
  });

  it("basis manual wajib punya jumlah orang", () => {
    const manual = {
      ...fixed,
      pricingMode: "per_pax",
      unitPrice: "10.000",
      paxBasis: "manual",
    };
    expect(budgetItemSchema.safeParse(manual).success).toBe(false);
    expect(budgetItemSchema.parse({ ...manual, paxManual: "50" }).paxManual).toBe(50);
  });

  it("item per orang tanpa basis memakai perkiraan tamu", () => {
    const parsed = budgetItemSchema.parse({ ...fixed, pricingMode: "per_pax", unitPrice: "1.000" });
    expect(parsed.paxBasis).toBe("guest_estimate");
  });

  it("menolak nominal yang tidak sah", () => {
    expect(budgetItemSchema.safeParse({ ...fixed, estimatedAmount: "dua juta" }).success).toBe(
      false,
    );
  });

  it("kategori harus UUID", () => {
    expect(budgetItemSchema.safeParse({ ...fixed, categoryId: "katering" }).success).toBe(false);
  });
});

describe("paymentSchema", () => {
  const valid = {
    budgetItemId: ID,
    label: " DP katering ",
    kind: "dp",
    amount: "15.000.000",
    dueDate: "2027-01-10",
    method: "",
    notes: "",
  };

  it("merapikan isian", () => {
    expect(paymentSchema.parse(valid)).toEqual({
      budgetItemId: ID,
      label: "DP katering",
      kind: "dp",
      amount: 15_000_000,
      dueDate: "2027-01-10",
      method: "",
      notes: "",
    });
  });

  it("jatuh tempo boleh kosong", () => {
    expect(paymentSchema.parse({ ...valid, dueDate: "" }).dueDate).toBeNull();
  });

  it("nominal wajib lebih dari nol", () => {
    expect(paymentSchema.safeParse({ ...valid, amount: "" }).success).toBe(false);
    expect(paymentSchema.safeParse({ ...valid, amount: "0" }).success).toBe(false);
  });

  it("menolak jenis yang tidak dikenal", () => {
    expect(paymentSchema.safeParse({ ...valid, kind: "cicilan" }).success).toBe(false);
  });

  it("menolak tanggal yang tidak ada", () => {
    expect(paymentSchema.safeParse({ ...valid, dueDate: "2027-02-30" }).success).toBe(false);
  });
});

describe("paidSchema", () => {
  it("tanggal bayar wajib dan harus sah", () => {
    expect(paidSchema.parse({ paidAt: "2027-01-08", method: " Transfer " })).toEqual({
      paidAt: "2027-01-08",
      method: "Transfer",
    });
    expect(paidSchema.safeParse({ paidAt: "", method: "" }).success).toBe(false);
    expect(paidSchema.safeParse({ paidAt: "2027-13-01", method: "" }).success).toBe(false);
  });
});
