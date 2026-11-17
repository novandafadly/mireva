import { z } from "zod";

const email = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .pipe(z.email().max(254));

export const PASSWORD_MIN_LENGTH = 8;
const newPassword = z.string().min(PASSWORD_MIN_LENGTH).max(72);

export const signUpSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  email,
  password: newPassword,
});

export const signInSchema = z.object({
  email,
  password: z.string().min(1),
});

export const emailOnlySchema = z.object({ email });
export const newPasswordSchema = z.object({ password: newPassword });

export type AuthErrorKey =
  | "invalidCredentials"
  | "emailTaken"
  | "weakPassword"
  | "emailNotConfirmed"
  | "rateLimited"
  | "invalidInput"
  | "linkInvalid"
  | "generic";

const ERROR_KEYS: Record<string, AuthErrorKey> = {
  invalid_credentials: "invalidCredentials",
  user_already_exists: "emailTaken",
  email_exists: "emailTaken",
  weak_password: "weakPassword",
  email_not_confirmed: "emailNotConfirmed",
  over_email_send_rate_limit: "rateLimited",
  over_request_rate_limit: "rateLimited",
};

/** Memetakan kode galat Supabase Auth ke kunci pesan di `messages/id.json`. */
export function authErrorKey(code: string | undefined): AuthErrorKey {
  return (code && ERROR_KEYS[code]) || "generic";
}
