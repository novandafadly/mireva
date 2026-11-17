import { describe, expect, it } from "vitest";
import { joinErrorKey, memberErrorKey } from "./errors";

describe("joinErrorKey", () => {
  it("mengenali pesan galat dari accept_wedding_invite", () => {
    expect(joinErrorKey({ message: "invite_not_found" })).toBe("invite_not_found");
    expect(joinErrorKey({ message: "invite_expired" })).toBe("invite_expired");
    expect(joinErrorKey({ message: "invite_email_mismatch" })).toBe("invite_email_mismatch");
    expect(joinErrorKey({ message: "already_member" })).toBe("already_member");
    expect(joinErrorKey({ message: "wedding_archived" })).toBe("wedding_archived");
    expect(joinErrorKey({ message: "max_two_owners" })).toBe("max_two_owners");
  });

  it("menyatukan semua limit_exceeded", () => {
    expect(joinErrorKey({ message: "limit_exceeded:members.max" })).toBe("limit_exceeded");
  });

  it("pesan lain menjadi galat umum, tanpa membocorkan isi pesan database", () => {
    expect(joinErrorKey({ message: "relation does not exist" })).toBe("generic");
    expect(joinErrorKey(null)).toBe("generic");
  });
});

describe("memberErrorKey", () => {
  it("undangan aktif ganda (unique violation)", () => {
    expect(memberErrorKey({ code: "23505", message: "duplicate key" })).toBe("alreadyInvited");
  });

  it("ditolak RLS atau hak tabel", () => {
    expect(memberErrorKey({ code: "42501", message: "permission denied" })).toBe("forbidden");
  });

  it("aturan owner", () => {
    expect(memberErrorKey({ code: "23514", message: "max_two_owners" })).toBe("maxOwners");
    expect(memberErrorKey({ code: "23514", message: "last_owner" })).toBe("lastOwner");
  });

  it("batas paket", () => {
    expect(memberErrorKey({ code: "P0001", message: "limit_exceeded:members.max" })).toBe(
      "limitReached",
    );
  });

  it("lainnya menjadi galat umum", () => {
    expect(memberErrorKey({ code: "XX000", message: "apa saja" })).toBe("generic");
    expect(memberErrorKey(null)).toBe("generic");
  });
});
