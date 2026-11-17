import "server-only";
import { createResendEmailSender } from "./resend";
import type { EmailSender } from "./types";

export type { EmailMessage, EmailSender } from "./types";

/**
 * Pengirim email sesuai lingkungan. Null bila belum dikonfigurasi: pemanggil
 * harus tetap berfungsi tanpa email (misalnya menampilkan link untuk disalin).
 */
export function getEmailSender(): EmailSender | null {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return null;
  return createResendEmailSender(apiKey, from);
}
