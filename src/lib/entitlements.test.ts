import { describe, expect, it } from "vitest";
import { assertCan, assertWithinLimit, can, EntitlementError, limit } from "./entitlements";

const wedding = {
  limits: {
    "guests.max": 100,
    "sessions.max": 2,
    "members.max": 2,
    "invitation.watermark": true,
    "checkin.enabled": false,
  },
};

describe("limit", () => {
  it("membaca batas angka dari snapshot wedding", () => {
    expect(limit(wedding, "guests.max")).toBe(100);
  });

  it("kunci yang tidak ada berarti 0, sama seperti private.wedding_limit", () => {
    expect(limit(wedding, "ai.monthly_tokens")).toBe(0);
    expect(limit({ limits: {} }, "guests.max")).toBe(0);
  });

  it("nilai yang bukan integer tidak negatif berarti 0", () => {
    expect(limit({ limits: { "guests.max": "banyak" } }, "guests.max")).toBe(0);
    expect(limit({ limits: { "guests.max": -5 } }, "guests.max")).toBe(0);
    expect(limit({ limits: { "guests.max": 10.5 } }, "guests.max")).toBe(0);
  });

  it("limits yang bukan objek berarti 0", () => {
    expect(limit({ limits: null }, "guests.max")).toBe(0);
    expect(limit({ limits: "rusak" }, "guests.max")).toBe(0);
  });
});

describe("can", () => {
  it("membaca fitur boolean", () => {
    expect(can(wedding, "invitation.watermark")).toBe(true);
    expect(can(wedding, "checkin.enabled")).toBe(false);
  });

  it("kunci yang tidak ada berarti tidak boleh", () => {
    expect(can(wedding, "album.enabled")).toBe(false);
  });

  it("hanya true yang berarti boleh", () => {
    expect(can({ limits: { "checkin.enabled": "true" } }, "checkin.enabled")).toBe(false);
    expect(can({ limits: { "checkin.enabled": 1 } }, "checkin.enabled")).toBe(false);
  });
});

describe("assertCan", () => {
  it("diam bila boleh", () => {
    expect(() => assertCan(wedding, "invitation.watermark")).not.toThrow();
  });

  it("melempar EntitlementError yang menyebut kuncinya", () => {
    expect(() => assertCan(wedding, "checkin.enabled")).toThrow(EntitlementError);
    try {
      assertCan(wedding, "checkin.enabled");
    } catch (error) {
      expect((error as EntitlementError).key).toBe("checkin.enabled");
    }
  });
});

describe("assertWithinLimit", () => {
  it("mengizinkan penambahan selama masih di bawah batas", () => {
    expect(() => assertWithinLimit(wedding, "members.max", 1)).not.toThrow();
  });

  it("menolak penambahan saat jumlah sudah mencapai batas", () => {
    expect(() => assertWithinLimit(wedding, "members.max", 2)).toThrow(EntitlementError);
  });

  it("menghitung penambahan lebih dari satu", () => {
    expect(() => assertWithinLimit(wedding, "guests.max", 90, 10)).not.toThrow();
    expect(() => assertWithinLimit(wedding, "guests.max", 90, 11)).toThrow(EntitlementError);
  });
});
