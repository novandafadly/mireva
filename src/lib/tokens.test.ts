import { describe, expect, it } from "vitest";
import { generatePin, generateToken, hashPin, hashToken, verifyPin } from "./tokens";

describe("generateToken", () => {
  it("menghasilkan 22 karakter base62 (128 bit)", () => {
    expect(generateToken()).toMatch(/^[0-9A-Za-z]{22}$/);
  });

  it("tidak mengulang nilai", () => {
    const seen = new Set(Array.from({ length: 1000 }, () => generateToken()));
    expect(seen.size).toBe(1000);
  });
});

describe("hashToken", () => {
  it("menghasilkan SHA-256 heksadesimal", () => {
    expect(hashToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});

describe("generatePin", () => {
  it("menghasilkan 6 digit, termasuk nol di depan", () => {
    for (let i = 0; i < 200; i++) {
      expect(generatePin()).toMatch(/^\d{6}$/);
    }
  });
});

describe("hashPin dan verifyPin", () => {
  it("PIN yang benar lolos", async () => {
    const hash = await hashPin("123456");
    expect(await verifyPin("123456", hash)).toBe(true);
  });

  it("PIN yang salah ditolak", async () => {
    const hash = await hashPin("123456");
    expect(await verifyPin("123457", hash)).toBe(false);
  });

  it("PIN yang sama menghasilkan hash berbeda karena salt", async () => {
    expect(await hashPin("123456")).not.toBe(await hashPin("123456"));
  });

  it("hash tidak memuat PIN", async () => {
    expect(await hashPin("123456")).not.toContain("123456");
  });

  it("hash rusak ditolak tanpa melempar galat", async () => {
    expect(await verifyPin("123456", "bukan-hash")).toBe(false);
  });
});
