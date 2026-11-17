import { describe, expect, it } from "vitest";
import { inviteSchema, MODULE_KEYS, permissionsSchema } from "./schema";

describe("permissionsSchema", () => {
  it("menerima izin per modul yang dikenal", () => {
    expect(permissionsSchema.parse({ budget: "view", guests: "edit" })).toEqual({
      budget: "view",
      guests: "edit",
    });
  });

  it("menolak modul yang tidak dikenal", () => {
    expect(permissionsSchema.safeParse({ rahasia: "edit" }).success).toBe(false);
  });

  it("menolak tingkat izin yang tidak dikenal", () => {
    expect(permissionsSchema.safeParse({ budget: "admin" }).success).toBe(false);
  });

  it("daftar modul sama dengan private.valid_permissions di database", () => {
    expect([...MODULE_KEYS].sort()).toEqual(
      [
        "album",
        "budget",
        "event_day",
        "guests",
        "invitation",
        "moodboard",
        "planning",
        "registry",
        "seserahan",
        "vendors",
      ].sort(),
    );
  });
});

describe("inviteSchema", () => {
  it("menormalkan email ke huruf kecil tanpa spasi", () => {
    const parsed = inviteSchema.parse({ email: "  Dimas@Example.com ", role: "owner" });
    expect(parsed.email).toBe("dimas@example.com");
  });

  it("menolak email yang tidak sah", () => {
    expect(inviteSchema.safeParse({ email: "bukan-email", role: "owner" }).success).toBe(false);
  });

  it("menolak peran yang tidak dikenal", () => {
    expect(inviteSchema.safeParse({ email: "a@b.co", role: "admin" }).success).toBe(false);
  });

  it("izin bawaan kosong", () => {
    expect(inviteSchema.parse({ email: "a@b.co", role: "collaborator" }).permissions).toEqual({});
  });

  it("undangan owner mengabaikan izin per modul", () => {
    const parsed = inviteSchema.parse({
      email: "a@b.co",
      role: "owner",
      permissions: { budget: "view" },
    });
    expect(parsed.permissions).toEqual({});
  });
});
