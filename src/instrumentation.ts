import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry-options";

export function register() {
  // Tanpa DSN (pengembangan lokal, CI), Sentry tidak aktif.
  if (!sentryOptions.dsn) return;

  Sentry.init({
    ...sentryOptions,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  });
}

export const onRequestError = Sentry.captureRequestError;
