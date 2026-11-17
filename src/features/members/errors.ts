/** Bentuk galat PostgREST yang relevan. */
type DbError = { code?: string; message?: string } | null | undefined;

const JOIN_ERRORS = [
  "invite_not_found",
  "invite_expired",
  "invite_email_mismatch",
  "already_member",
  "wedding_archived",
  "max_two_owners",
] as const;

export type JoinErrorKey = (typeof JOIN_ERRORS)[number] | "limit_exceeded" | "generic";

/** Memetakan galat `accept_wedding_invite` ke kunci pesan `join.errors.*`. */
export function joinErrorKey(error: DbError): JoinErrorKey {
  const message = error?.message ?? "";
  if (message.startsWith("limit_exceeded")) return "limit_exceeded";
  return JOIN_ERRORS.find((key) => key === message) ?? "generic";
}

export type MemberErrorKey =
  | "invalidInput"
  | "alreadyInvited"
  | "limitReached"
  | "maxOwners"
  | "lastOwner"
  | "forbidden"
  | "generic";

/** Memetakan galat tulis anggota dan undangan ke kunci pesan `members.errors.*`. */
export function memberErrorKey(error: DbError): MemberErrorKey {
  const message = error?.message ?? "";
  if (error?.code === "23505") return "alreadyInvited";
  if (error?.code === "42501") return "forbidden";
  if (message.startsWith("limit_exceeded")) return "limitReached";
  if (message === "max_two_owners") return "maxOwners";
  if (message === "last_owner") return "lastOwner";
  return "generic";
}
