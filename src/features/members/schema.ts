import { z } from "zod";

/** Kunci modul untuk izin kolaborator. Harus sama dengan `private.valid_permissions`. */
export const MODULE_KEYS = [
  "planning",
  "budget",
  "vendors",
  "guests",
  "invitation",
  "event_day",
  "registry",
  "seserahan",
  "moodboard",
  "album",
] as const;

/** Modul yang sudah ada di Fase 1 dan ditampilkan di formulir izin. */
export const PHASE_ONE_MODULE_KEYS = [
  "planning",
  "budget",
  "vendors",
  "guests",
  "invitation",
  "event_day",
] as const satisfies readonly ModuleKey[];

export const ACCESS_LEVELS = ["none", "view", "edit"] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];
export type AccessLevel = (typeof ACCESS_LEVELS)[number];
export type Permissions = Partial<Record<ModuleKey, AccessLevel>>;

export const permissionsSchema = z.strictObject(
  Object.fromEntries(MODULE_KEYS.map((key) => [key, z.enum(ACCESS_LEVELS).optional()])) as Record<
    ModuleKey,
    z.ZodOptional<z.ZodEnum<{ none: "none"; view: "view"; edit: "edit" }>>
  >,
);

export const roleSchema = z.enum(["owner", "collaborator"]);
export type MemberRole = z.infer<typeof roleSchema>;

export const inviteSchema = z
  .object({
    email: z
      .string()
      .transform((value) => value.trim().toLowerCase())
      .pipe(z.email().max(254)),
    role: roleSchema,
    permissions: permissionsSchema.default({}),
  })
  // Owner selalu punya akses penuh, jadi izin per modul tidak disimpan.
  .transform((invite) => (invite.role === "owner" ? { ...invite, permissions: {} } : invite));

export type InviteInput = z.infer<typeof inviteSchema>;
