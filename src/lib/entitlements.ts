/**
 * Satu-satunya tempat kode aplikasi memutuskan "boleh atau tidak" dan "berapa
 * batasnya" (D-012). Membaca snapshot `weddings.limits`. Padanannya di database
 * adalah `private.wedding_limit()`; keduanya menganggap kunci yang tidak ada
 * sebagai 0 atau tidak boleh.
 *
 * Aturan lint melarang membaca `wedding.plan` atau `wedding.limits` di luar file ini.
 */

export type LimitKey = "guests.max" | "sessions.max" | "members.max" | "ai.monthly_tokens";

export type FeatureKey =
  | "invitation.watermark"
  | "invitation.premium_templates"
  | "checkin.enabled"
  | "finance.advanced"
  | "album.enabled";

export type EntitlementKey = LimitKey | FeatureKey;

/** Bentuk minimal wedding yang dibutuhkan pengecekan. `limits` berasal dari jsonb. */
export type EntitledWedding = { limits: unknown };

/** Dilempar saat paket wedding tidak mencakup fitur atau batasnya terlampaui. */
export class EntitlementError extends Error {
  readonly key: EntitlementKey;

  constructor(key: EntitlementKey) {
    super(`Paket wedding tidak mencakup: ${key}`);
    this.name = "EntitlementError";
    this.key = key;
  }
}

function read(wedding: EntitledWedding, key: EntitlementKey): unknown {
  const { limits } = wedding;
  if (typeof limits !== "object" || limits === null) return undefined;
  return (limits as Record<string, unknown>)[key];
}

export function limit(wedding: EntitledWedding, key: LimitKey): number {
  const value = read(wedding, key);
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

export function can(wedding: EntitledWedding, key: FeatureKey): boolean {
  return read(wedding, key) === true;
}

export function assertCan(wedding: EntitledWedding, key: FeatureKey): void {
  if (!can(wedding, key)) throw new EntitlementError(key);
}

/** Memastikan `currentCount + adding` tidak melewati batas. */
export function assertWithinLimit(
  wedding: EntitledWedding,
  key: LimitKey,
  currentCount: number,
  adding = 1,
): void {
  if (currentCount + adding > limit(wedding, key)) throw new EntitlementError(key);
}
