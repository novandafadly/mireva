import { describe, expect, it } from "vitest";
import { wizardSchema } from "./schema";

const base = {
  partnerA: " Rina ",
  partnerB: "Dimas",
  dateMode: "exact",
  dateStart: "2027-05-10",
  dateEnd: "",
  city: "Bandung",
  timezone: "Asia/Jakarta",
  customs: ["sunda"],
  ceremony: "akad",
  guestEstimate: "300",
  totalBudget: "Rp150.000.000",
};

describe("wizardSchema", () => {
  it("menerima isian lengkap dan merapikannya", () => {
    const parsed = wizardSchema.parse(base);
    expect(parsed).toMatchObject({
      partnerA: "Rina",
      dateStart: "2027-05-10",
      dateEnd: null,
      dateIsFinal: true,
      guestEstimate: 300,
      totalBudget: 150_000_000,
      ceremony: "akad",
    });
  });

  it("tanggal pasti wajib diisi", () => {
    expect(wizardSchema.safeParse({ ...base, dateStart: "" }).success).toBe(false);
  });

  it("rentang tanggal menyimpan awal dan akhir, belum final", () => {
    const parsed = wizardSchema.parse({
      ...base,
      dateMode: "range",
      dateStart: "2027-05-01",
      dateEnd: "2027-06-30",
    });
    expect(parsed).toMatchObject({
      dateStart: "2027-05-01",
      dateEnd: "2027-06-30",
      dateIsFinal: false,
    });
  });

  it("menolak rentang yang akhirnya sebelum awalnya", () => {
    const result = wizardSchema.safeParse({
      ...base,
      dateMode: "range",
      dateStart: "2027-06-30",
      dateEnd: "2027-05-01",
    });
    expect(result.success).toBe(false);
  });

  it("tanggal belum tahu mengosongkan keduanya", () => {
    const parsed = wizardSchema.parse({ ...base, dateMode: "unknown", dateStart: "2027-05-10" });
    expect(parsed).toMatchObject({ dateStart: null, dateEnd: null, dateIsFinal: false });
  });

  it("menolak tanggal yang tidak ada di kalender", () => {
    expect(wizardSchema.safeParse({ ...base, dateStart: "2027-02-30" }).success).toBe(false);
  });

  it("maksimal dua adat, tanpa duplikat", () => {
    expect(wizardSchema.safeParse({ ...base, customs: ["jawa", "sunda", "minang"] }).success).toBe(
      false,
    );
    expect(wizardSchema.parse({ ...base, customs: ["jawa", "jawa"] }).customs).toEqual(["jawa"]);
    expect(wizardSchema.parse({ ...base, customs: [] }).customs).toEqual([]);
  });

  it("menolak adat yang tidak dikenal", () => {
    expect(wizardSchema.safeParse({ ...base, customs: ["viking"] }).success).toBe(false);
  });

  it("jenis upacara boleh kosong", () => {
    expect(wizardSchema.parse({ ...base, ceremony: "" }).ceremony).toBeNull();
  });

  it("anggaran dan jumlah tamu kosong berarti nol", () => {
    const parsed = wizardSchema.parse({ ...base, totalBudget: "", guestEstimate: "" });
    expect(parsed.totalBudget).toBe(0);
    expect(parsed.guestEstimate).toBe(0);
  });

  it("menolak anggaran yang bukan nominal Rupiah utuh", () => {
    expect(wizardSchema.safeParse({ ...base, totalBudget: "150 juta" }).success).toBe(false);
    expect(wizardSchema.safeParse({ ...base, totalBudget: "1.500,50" }).success).toBe(false);
  });

  it("menolak jumlah tamu negatif, pecahan, atau tidak masuk akal", () => {
    expect(wizardSchema.safeParse({ ...base, guestEstimate: "-5" }).success).toBe(false);
    expect(wizardSchema.safeParse({ ...base, guestEstimate: "10.5" }).success).toBe(false);
    expect(wizardSchema.safeParse({ ...base, guestEstimate: "1000000" }).success).toBe(false);
  });

  it("menolak zona waktu di luar Indonesia", () => {
    expect(wizardSchema.safeParse({ ...base, timezone: "Asia/Singapore" }).success).toBe(false);
  });
});
