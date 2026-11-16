/**
 * Rupiah sebagai integer. Tidak ada pecahan di mana pun (lihat D-010).
 * Semua format dan aritmetika nominal lewat modul ini.
 */

const BASIS_POINTS_TOTAL = 10_000;

export function assertRupiah(amount: number): void {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new RangeError(`Nominal Rupiah harus integer tidak negatif: ${amount}`);
  }
}

export function formatRupiah(amount: number): string {
  assertRupiah(amount);
  return `Rp${String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

/** Membaca masukan pengguna. Mengembalikan null bila bukan nominal Rupiah utuh. */
export function parseRupiah(input: string): number | null {
  const cleaned = input
    .trim()
    .replace(/^rp\.?\s*/i, "")
    .replace(/,(00|-)$/, "");
  if (!/^\d{1,3}(\.\d{3})*$/.test(cleaned) && !/^\d+$/.test(cleaned)) {
    return null;
  }
  const amount = Number(cleaned.replaceAll(".", ""));
  return Number.isSafeInteger(amount) ? amount : null;
}

export function sumRupiah(amounts: readonly number[]): number {
  let total = 0;
  for (const amount of amounts) {
    assertRupiah(amount);
    total += amount;
  }
  assertRupiah(total);
  return total;
}

/**
 * Membagi total menurut porsi basis poin (jumlah porsi = 10.000).
 * Sisa pembulatan diberikan ke pecahan terbesar, lalu ke indeks terkecil,
 * sehingga jumlah hasil selalu sama dengan total.
 */
export function allocateByBasisPoints(total: number, shares: readonly number[]): number[] {
  assertRupiah(total);
  let shareSum = 0;
  for (const share of shares) {
    if (!Number.isInteger(share) || share < 0) {
      throw new RangeError(`Porsi basis poin tidak sah: ${share}`);
    }
    shareSum += share;
  }
  if (shareSum !== BASIS_POINTS_TOTAL) {
    throw new RangeError(`Jumlah porsi harus 10.000 basis poin, dapat ${shareSum}`);
  }

  const divisor = BigInt(BASIS_POINTS_TOTAL);
  const products = shares.map((share) => BigInt(total) * BigInt(share));
  const parts = products.map((product) => product / divisor);
  let remainder = BigInt(total) - parts.reduce((a, b) => a + b, BigInt(0));

  const byFraction = products
    .map((product, index) => ({ index, fraction: product % divisor }))
    .sort((a, b) =>
      a.fraction === b.fraction ? a.index - b.index : a.fraction > b.fraction ? -1 : 1,
    );

  for (const { index } of byFraction) {
    if (remainder === BigInt(0)) break;
    parts[index] = parts[index]! + BigInt(1);
    remainder -= BigInt(1);
  }
  return parts.map(Number);
}

/** Persentase terpakai, dibulatkan ke bawah. Null bila estimasi nol. */
export function percentUsed(realized: number, estimate: number): number | null {
  assertRupiah(realized);
  assertRupiah(estimate);
  if (estimate === 0) return null;
  return Number((BigInt(realized) * BigInt(100)) / BigInt(estimate));
}
