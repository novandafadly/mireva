import { getRequestConfig } from "next-intl/server";

// D-018: satu locale, tanpa awalan locale di URL.
export const defaultLocale = "id";

export default getRequestConfig(async () => ({
  locale: defaultLocale,
  timeZone: "Asia/Jakarta",
  messages: (await import("../../messages/id.json")).default,
}));
