import "server-only";
import { headers } from "next/headers";

/**
 * URL dasar situs untuk link di email dan redirect OAuth.
 * NEXT_PUBLIC_SITE_URL diutamakan supaya link tidak bergantung pada header Host
 * yang dikirim klien. Header hanya dipakai bila variabel itu belum diisi.
 */
export async function siteUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  return `${protocol}://${host}`;
}
