import { describe, expect, it } from "vitest";
import { safeNextPath } from "./redirects";

describe("safeNextPath", () => {
  it("menerima path internal", () => {
    expect(safeNextPath("/gabung/abc123")).toBe("/gabung/abc123");
    expect(safeNextPath("/app/w/1/dasbor?tab=a")).toBe("/app/w/1/dasbor?tab=a");
  });

  it("memakai bawaan /app bila kosong", () => {
    expect(safeNextPath(undefined)).toBe("/app");
    expect(safeNextPath("")).toBe("/app");
    expect(safeNextPath(null)).toBe("/app");
  });

  it("menolak URL absolut ke situs lain", () => {
    expect(safeNextPath("https://jahat.example/phish")).toBe("/app");
  });

  it("menolak URL relatif-protokol dan variasi garis miring terbalik", () => {
    expect(safeNextPath("//jahat.example")).toBe("/app");
    expect(safeNextPath("/\\jahat.example")).toBe("/app");
    expect(safeNextPath("/\tjahat")).toBe("/app");
  });

  it("menolak path yang tidak diawali garis miring", () => {
    expect(safeNextPath("app")).toBe("/app");
    expect(safeNextPath("javascript:alert(1)")).toBe("/app");
  });

  it("hanya memakai nilai pertama bila berupa array", () => {
    expect(safeNextPath(["/gabung/x", "https://jahat.example"])).toBe("/gabung/x");
  });
});
