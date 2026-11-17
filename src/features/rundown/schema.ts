import { z } from "zod";

const LOCAL_INPUT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const MAX_DURATION_MIN = 24 * 60;

const emptyToNull = (value: string) => (value === "" ? null : value);

export const rundownItemSchema = z.object({
  title: z.string().trim().min(1).max(200),
  eventSessionId: z
    .string()
    .trim()
    .refine((value) => value === "" || z.uuid().safeParse(value).success)
    .transform(emptyToNull),
  /** Nilai datetime-local. Diubah ke instant di zona wedding oleh action. */
  startsAt: z
    .string()
    .trim()
    .refine((value) => value === "" || LOCAL_INPUT.test(value))
    .transform(emptyToNull),
  durationMin: z
    .string()
    .trim()
    .refine((value) => value === "" || (/^\d+$/.test(value) && Number(value) <= MAX_DURATION_MIN))
    .transform((value) => (value === "" ? null : Number(value))),
  picText: z.string().trim().max(120),
  location: z.string().trim().max(200),
  notes: z.string().trim().max(2000),
});

export type RundownItemInput = z.infer<typeof rundownItemSchema>;

export type RundownItem = {
  id: string;
  eventSessionId: string | null;
  title: string;
  /** Instant ISO. */
  startsAt: string | null;
  durationMin: number | null;
  picText: string;
  location: string;
  notes: string;
  sortOrder: number;
};

export type RundownSession = { id: string; name: string; sortOrder: number };

export type SessionGroup = { session: RundownSession | null; items: RundownItem[] };

function byTime(a: RundownItem, b: RundownItem): number {
  if (a.startsAt && b.startsAt)
    return a.startsAt.localeCompare(b.startsAt) || a.sortOrder - b.sortOrder;
  if (a.startsAt) return -1;
  if (b.startsAt) return 1;
  return a.sortOrder - b.sortOrder;
}

/**
 * Rundown per sesi, mengikuti urutan sesi. Acara tanpa sesi dikumpulkan di
 * kelompok terakhir, yang hanya muncul bila ada isinya.
 */
export function groupBySession(
  sessions: readonly RundownSession[],
  items: readonly RundownItem[],
): SessionGroup[] {
  const known = new Set(sessions.map((session) => session.id));
  const groups: SessionGroup[] = [...sessions]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((session) => ({
      session,
      items: items.filter((item) => item.eventSessionId === session.id).sort(byTime),
    }));
  const loose = items
    .filter((item) => !item.eventSessionId || !known.has(item.eventSessionId))
    .sort(byTime);
  if (loose.length > 0) groups.push({ session: null, items: loose });
  return groups;
}
