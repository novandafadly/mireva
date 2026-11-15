/**
 * Satu-satunya sumber nama produk, tagline, dan domain.
 *
 * Nama produk belum final. Jangan menulis nama, tagline, atau domain sebagai
 * string literal di tempat lain (metadata, email, template undangan, PWA
 * manifest, watermark, PDF, pesan wa.me). Impor dari file ini.
 */
export const brand = {
  name: "Wedding App",
  tagline: "",
  domain: "localhost",
} as const;

export type Brand = typeof brand;
