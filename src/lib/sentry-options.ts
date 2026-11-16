/**
 * Opsi Sentry bersama untuk server dan browser.
 *
 * Bawaan SDK mengumpulkan cookie, header, body, dan query string. Di produk ini
 * query string memuat token tamu (`?to=`) dan body memuat nama serta nomor HP,
 * jadi semuanya dimatikan (minimisasi data).
 */
export const sentryOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
  },
};
