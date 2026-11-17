import "server-only";
import type { EmailSender } from "./types";

/** Pengirim nyata lewat API HTTP Resend. Kunci hanya dibaca di server. */
export function createResendEmailSender(apiKey: string, from: string): EmailSender {
  return {
    async send(message) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
        }),
      });
      if (!response.ok) {
        throw new Error(`Gagal mengirim email: HTTP ${response.status}`);
      }
    },
  };
}
