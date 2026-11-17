import { brand } from "@/config/brand";
import type { EmailMessage } from "./types";

export function memberInviteEmail(input: {
  to: string;
  inviterName: string;
  weddingName: string;
  link: string;
}): EmailMessage {
  return {
    to: input.to,
    subject: `Undangan bergabung: ${input.weddingName}`,
    text: [
      `Halo,`,
      ``,
      `${input.inviterName} mengundang Anda untuk ikut mengelola persiapan pernikahan "${input.weddingName}" di ${brand.name}.`,
      ``,
      `Buka link ini untuk bergabung (berlaku 7 hari):`,
      input.link,
      ``,
      `Masuk atau daftar dengan alamat email ini. Jika Anda tidak mengenal pengirimnya, abaikan email ini.`,
    ].join("\n"),
  };
}
