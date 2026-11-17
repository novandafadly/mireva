const DEFAULT_PATH = "/app";

/**
 * Tujuan setelah login (`?lanjut=`). Hanya path internal yang diterima supaya
 * link login tidak bisa dipakai untuk mengarahkan pengguna ke situs lain.
 */
export function safeNextPath(value: string | string[] | null | undefined): string {
  const path = Array.isArray(value) ? value[0] : value;
  if (!path || !path.startsWith("/")) return DEFAULT_PATH;
  // "//host" dan "/\\host" ditafsirkan browser sebagai host lain.
  if (/^\/[\/\\]/.test(path) || /[\u0000-\u001f\\]/.test(path)) return DEFAULT_PATH;
  return path;
}
