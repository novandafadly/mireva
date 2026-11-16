import { describe, expect, it } from "vitest";
import { parsePublicEnv, parseServerEnv } from "./env";

const publicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_contoh",
};

describe("parsePublicEnv", () => {
  it("menerima URL dan kunci publik Supabase", () => {
    expect(parsePublicEnv(publicEnv).NEXT_PUBLIC_SUPABASE_URL).toBe("http://127.0.0.1:54321");
  });

  it("menyebut nama variabel yang hilang", () => {
    expect(() => parsePublicEnv({})).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("menolak URL yang tidak sah", () => {
    expect(() => parsePublicEnv({ ...publicEnv, NEXT_PUBLIC_SUPABASE_URL: "bukan-url" })).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL/,
    );
  });
});

describe("parseServerEnv", () => {
  it("mewajibkan kunci service role", () => {
    expect(() => parseServerEnv(publicEnv)).toThrow(/SUPABASE_SECRET_KEY/);
  });

  it("menerima lingkungan server lengkap", () => {
    const env = parseServerEnv({ ...publicEnv, SUPABASE_SECRET_KEY: "sb_secret_contoh" });
    expect(env.SUPABASE_SECRET_KEY).toBe("sb_secret_contoh");
  });
});
