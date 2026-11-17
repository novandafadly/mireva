"use server";

import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/redirects";
import { siteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";
import {
  authErrorKey,
  emailOnlySchema,
  newPasswordSchema,
  signInSchema,
  signUpSchema,
  type AuthErrorKey,
} from "./schema";

export type AuthFormState = {
  error?: AuthErrorKey;
  notice?: "checkEmail" | "resetSent";
};

function nextPathFrom(formData: FormData): string {
  const value = formData.get("lanjut");
  return safeNextPath(typeof value === "string" ? value : null);
}

async function callbackUrl(nextPath: string): Promise<string> {
  return `${await siteUrl()}/auth/callback?lanjut=${encodeURIComponent(nextPath)}`;
}

export async function signIn(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "invalidInput" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: authErrorKey(error.code) };

  redirect(nextPathFrom(formData));
}

export async function signUp(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "invalidInput" };

  const nextPath = nextPathFrom(formData);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: await callbackUrl(nextPath),
    },
  });
  if (error) return { error: authErrorKey(error.code) };

  // Tanpa sesi berarti konfirmasi email aktif: pengguna harus membuka link dulu.
  if (!data.session) return { notice: "checkEmail" };
  redirect(nextPath);
}

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: await callbackUrl(nextPathFrom(formData)) },
  });
  if (error || !data.url) redirect("/masuk?galat=generic");
  redirect(data.url);
}

export async function requestPasswordReset(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = emailOnlySchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: "invalidInput" };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: await callbackUrl("/atur-sandi"),
  });
  if (error && authErrorKey(error.code) === "rateLimited") return { error: "rateLimited" };

  // Jawaban sama untuk email terdaftar maupun tidak, supaya tidak membocorkan
  // siapa yang punya akun.
  return { notice: "resetSent" };
}

export async function updatePassword(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = newPasswordSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) return { error: "weakPassword" };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: authErrorKey(error.code) };

  redirect("/app");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/masuk");
}
