/**
 * Zona waktu wedding dan tanggal kalender (lihat D-011).
 * Tanggal tanpa jam berbentuk string "YYYY-MM-DD" dan ditafsirkan di zona wedding.
 * Ketiga zona Indonesia tidak punya DST, jadi offsetnya tetap.
 */

const ZONES = {
  "Asia/Jakarta": { label: "WIB", offsetHours: 7 },
  "Asia/Makassar": { label: "WITA", offsetHours: 8 },
  "Asia/Jayapura": { label: "WIT", offsetHours: 9 },
} as const;

export type WeddingTimezone = keyof typeof ZONES;

export const WEDDING_TIMEZONES = Object.keys(ZONES) as WeddingTimezone[];
export const DEFAULT_TIMEZONE: WeddingTimezone = "Asia/Jakarta";

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

export function isWeddingTimezone(value: string): value is WeddingTimezone {
  return Object.hasOwn(ZONES, value);
}

export function timezoneLabel(timezone: WeddingTimezone): string {
  return ZONES[timezone].label;
}

function formatCalendarDate(utcMs: number): string {
  return new Date(utcMs).toISOString().slice(0, 10);
}

/** Milidetik UTC untuk tengah malam UTC pada tanggal kalender tersebut. */
function parseCalendarDate(date: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (match) {
    const ms = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (formatCalendarDate(ms) === date) return ms;
  }
  throw new RangeError(`Tanggal tidak sah: ${date}`);
}

/** Tanggal kalender di zona wedding untuk suatu saat. */
export function dateInZone(instant: Date, timezone: WeddingTimezone): string {
  return formatCalendarDate(instant.getTime() + ZONES[timezone].offsetHours * MS_PER_HOUR);
}

/** Saat tengah malam (awal hari) tanggal tersebut di zona wedding. */
export function startOfDayInZone(date: string, timezone: WeddingTimezone): Date {
  return new Date(parseCalendarDate(date) - ZONES[timezone].offsetHours * MS_PER_HOUR);
}

export function addDays(date: string, days: number): string {
  return formatCalendarDate(parseCalendarDate(date) + days * MS_PER_DAY);
}

/** Selisih hari kalender dari hari ini (di zona wedding) ke tanggal tujuan. */
export function daysUntil(date: string, now: Date, timezone: WeddingTimezone): number {
  const today = parseCalendarDate(dateInZone(now, timezone));
  return Math.round((parseCalendarDate(date) - today) / MS_PER_DAY);
}

/**
 * Akses crew berlaku sampai penghujung hari setelah tanggal acara terakhir,
 * dihitung di zona wedding.
 */
export function crewAccessExpiry(lastEventDate: string, timezone: WeddingTimezone): Date {
  return startOfDayInZone(addDays(lastEventDate, 2), timezone);
}
