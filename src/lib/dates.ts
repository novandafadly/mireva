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

/** Benar bila string berbentuk "YYYY-MM-DD" dan tanggalnya ada di kalender. */
export function isCalendarDate(value: string): boolean {
  try {
    parseCalendarDate(value);
    return true;
  } catch {
    return false;
  }
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

const LOCAL_INPUT = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/;

/**
 * Isian `<input type="datetime-local">` ("YYYY-MM-DDTHH:MM"), ditafsirkan di
 * zona wedding, menjadi instant ISO. Null bila kosong atau tidak sah.
 */
export function localInputToInstant(value: string, timezone: WeddingTimezone): string | null {
  const match = LOCAL_INPUT.exec(value);
  if (!match || !isCalendarDate(match[1]!)) return null;
  const hours = Number(match[2]);
  const minutes = Number(match[3]);
  if (hours > 23 || minutes > 59) return null;
  const dayStart = startOfDayInZone(match[1]!, timezone).getTime();
  return new Date(dayStart + hours * MS_PER_HOUR + minutes * 60_000).toISOString();
}

/** Kebalikan `localInputToInstant`: instant menjadi nilai untuk datetime-local. */
export function instantToLocalInput(instant: string, timezone: WeddingTimezone): string {
  const shifted = new Date(new Date(instant).getTime() + ZONES[timezone].offsetHours * MS_PER_HOUR);
  return shifted.toISOString().slice(0, 16);
}

/** Jam di zona wedding dengan label zonanya, mis. "08.00 WIB". */
export function formatClock(instant: string, timezone: WeddingTimezone): string {
  const time = instantToLocalInput(instant, timezone).slice(11).replace(":", ".");
  return `${time} ${ZONES[timezone].label}`;
}
