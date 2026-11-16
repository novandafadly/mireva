import { z } from "zod";

/**
 * Validasi variabel lingkungan. Kunci server tidak boleh diimpor dari kode klien:
 * hanya `publicEnv()` yang aman dipakai di browser.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

const serverSchema = publicSchema.extend({
  SUPABASE_SECRET_KEY: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

type RawEnv = Record<string, string | undefined>;

function parse<T>(schema: z.ZodType<T>, raw: RawEnv): T {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const names = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Variabel lingkungan hilang atau tidak sah: ${names}. Lihat .env.example.`);
  }
  return result.data;
}

export function parsePublicEnv(raw: RawEnv): PublicEnv {
  return parse(publicSchema, raw);
}

export function parseServerEnv(raw: RawEnv): ServerEnv {
  return parse(serverSchema, raw);
}

/** Nama variabel ditulis lengkap supaya Next.js bisa menyisipkannya ke bundel klien. */
export function publicEnv(): PublicEnv {
  return parsePublicEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

export function serverEnv(): ServerEnv {
  return parseServerEnv(process.env);
}
