/** Lapisan abstraksi email (D-020). Modul fitur hanya mengenal antarmuka ini. */
export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
};

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}
