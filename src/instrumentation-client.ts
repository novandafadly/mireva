import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry-options";

if (sentryOptions.dsn) {
  Sentry.init({
    ...sentryOptions,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  });
}
