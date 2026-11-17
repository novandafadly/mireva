import type { EmailMessage, EmailSender } from "./types";

/** Pengirim palsu untuk tes: mencatat pesan, tidak memanggil layanan luar. */
export function createFakeEmailSender(): EmailSender & { sent: EmailMessage[] } {
  const sent: EmailMessage[] = [];
  return {
    sent,
    async send(message) {
      sent.push(message);
    },
  };
}
