import { describe, expect, it } from "vitest";
import {
  allocateByBasisPoints,
  assertRupiah,
  formatRupiah,
  parseRupiah,
  percentUsed,
  sumRupiah,
} from "./money";

describe("assertRupiah", () => {
  it("menerima integer nol dan positif", () => {
    expect(() => assertRupiah(0)).not.toThrow();
    expect(() => assertRupiah(1_500_000)).not.toThrow();
  });

  it("menolak pecahan", () => {
    expect(() => assertRupiah(1000.5)).toThrow(RangeError);
  });

  it("menolak negatif", () => {
    expect(() => assertRupiah(-1)).toThrow(RangeError);
  });

  it("menolak angka di luar batas integer aman", () => {
    expect(() => assertRupiah(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError);
    expect(() => assertRupiah(Number.NaN)).toThrow(RangeError);
  });
});

describe("formatRupiah", () => {
  it("memakai titik sebagai pemisah ribuan", () => {
    expect(formatRupiah(1_500_000)).toBe("Rp1.500.000");
  });

  it("memformat nol", () => {
    expect(formatRupiah(0)).toBe("Rp0");
  });

  it("tidak menambah pemisah di bawah seribu", () => {
    expect(formatRupiah(999)).toBe("Rp999");
  });

  it("menolak pecahan", () => {
    expect(() => formatRupiah(10.5)).toThrow(RangeError);
  });
});

describe("parseRupiah", () => {
  it("membaca angka polos", () => {
    expect(parseRupiah("1500000")).toBe(1_500_000);
  });

  it("membaca format dengan Rp dan titik", () => {
    expect(parseRupiah("Rp 1.500.000")).toBe(1_500_000);
    expect(parseRupiah("rp1.500.000")).toBe(1_500_000);
  });

  it("mengabaikan akhiran ,00 dan ,-", () => {
    expect(parseRupiah("1.500.000,00")).toBe(1_500_000);
    expect(parseRupiah("Rp 25.000,-")).toBe(25_000);
  });

  it("mengembalikan null untuk input kosong", () => {
    expect(parseRupiah("   ")).toBeNull();
  });

  it("mengembalikan null untuk pecahan sen", () => {
    expect(parseRupiah("1.500,50")).toBeNull();
  });

  it("mengembalikan null untuk teks bukan angka", () => {
    expect(parseRupiah("dua juta")).toBeNull();
    expect(parseRupiah("-5000")).toBeNull();
  });
});

describe("sumRupiah", () => {
  it("menjumlahkan daftar", () => {
    expect(sumRupiah([1000, 2500, 0])).toBe(3500);
  });

  it("daftar kosong berjumlah nol", () => {
    expect(sumRupiah([])).toBe(0);
  });

  it("menolak anggota pecahan", () => {
    expect(() => sumRupiah([1000, 0.5])).toThrow(RangeError);
  });
});

describe("allocateByBasisPoints", () => {
  it("membagi rata tanpa sisa", () => {
    expect(allocateByBasisPoints(1000, [5000, 5000])).toEqual([500, 500]);
  });

  it("jumlah porsi selalu sama dengan total", () => {
    const parts = allocateByBasisPoints(100, [3333, 3333, 3334]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("memberi sisa ke pecahan terbesar", () => {
    // 100 × 0,3333 = 33,33 ; 100 × 0,3334 = 33,34 → sisa 1 ke porsi terakhir
    expect(allocateByBasisPoints(100, [3333, 3333, 3334])).toEqual([33, 33, 34]);
  });

  it("memberi sisa ke indeks terkecil bila pecahan sama", () => {
    expect(allocateByBasisPoints(1, [5000, 5000])).toEqual([1, 0]);
    expect(allocateByBasisPoints(10, [3333, 3333, 3334])).toEqual([3, 3, 4]);
    expect(allocateByBasisPoints(2, [2500, 2500, 2500, 2500])).toEqual([1, 1, 0, 0]);
  });

  it("tetap tepat untuk nominal besar", () => {
    const total = 9_000_000_000_000_001;
    const parts = allocateByBasisPoints(total, [3333, 6667]);
    expect(parts[0]! + parts[1]!).toBe(total);
    expect(parts[0]).toBe(2_999_700_000_000_000);
  });

  it("menolak porsi yang tidak berjumlah 10.000", () => {
    expect(() => allocateByBasisPoints(100, [5000, 4000])).toThrow(RangeError);
  });

  it("menolak porsi negatif atau pecahan", () => {
    expect(() => allocateByBasisPoints(100, [-1, 10001])).toThrow(RangeError);
    expect(() => allocateByBasisPoints(100, [5000.5, 4999.5])).toThrow(RangeError);
  });
});

describe("percentUsed", () => {
  it("membulatkan ke bawah", () => {
    expect(percentUsed(999, 1000)).toBe(99);
    expect(percentUsed(1, 3)).toBe(33);
  });

  it("bisa melebihi 100", () => {
    expect(percentUsed(1500, 1000)).toBe(150);
  });

  it("estimasi nol menghasilkan null", () => {
    expect(percentUsed(500, 0)).toBeNull();
    expect(percentUsed(0, 0)).toBeNull();
  });
});
