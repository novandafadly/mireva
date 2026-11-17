import { describe, expect, it } from "vitest";
import { authErrorKey, signInSchema, signUpSchema } from "./schema";

describe("signUpSchema", () => {
  const valid = { fullName: "Rina Kartika", email: "Rina@Example.com ", password: "rahasia-123" };

  it("menormalkan email", () => {
    expect(signUpSchema.parse(valid).email).toBe("rina@example.com");
  });

  it("menolak sandi di bawah 8 karakter", () => {
    expect(signUpSchema.safeParse({ ...valid, password: "pendek" }).success).toBe(false);
  });

  it("menolak nama kosong", () => {
    expect(signUpSchema.safeParse({ ...valid, fullName: "   " }).success).toBe(false);
  });

  it("tidak memangkas sandi", () => {
    expect(signUpSchema.parse({ ...valid, password: " sandi dengan spasi " }).password).toBe(
      " sandi dengan spasi ",
    );
  });
});

describe("signInSchema", () => {
  it("menolak email tidak sah", () => {
    expect(signInSchema.safeParse({ email: "rina", password: "x" }).success).toBe(false);
  });

  it("menerima sandi lama yang pendek (aturan panjang hanya saat mendaftar)", () => {
    expect(signInSchema.safeParse({ email: "rina@example.com", password: "x" }).success).toBe(true);
  });
});

describe("authErrorKey", () => {
  it("memetakan kode galat Supabase ke kunci pesan", () => {
    expect(authErrorKey("invalid_credentials")).toBe("invalidCredentials");
    expect(authErrorKey("user_already_exists")).toBe("emailTaken");
    expect(authErrorKey("email_exists")).toBe("emailTaken");
    expect(authErrorKey("weak_password")).toBe("weakPassword");
    expect(authErrorKey("email_not_confirmed")).toBe("emailNotConfirmed");
    expect(authErrorKey("over_email_send_rate_limit")).toBe("rateLimited");
    expect(authErrorKey("over_request_rate_limit")).toBe("rateLimited");
  });

  it("kode yang tidak dikenal menjadi pesan umum", () => {
    expect(authErrorKey("sesuatu_yang_baru")).toBe("generic");
    expect(authErrorKey(undefined)).toBe("generic");
  });
});
