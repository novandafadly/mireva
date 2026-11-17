import type { AccessLevel, MemberRole, ModuleKey, Permissions } from "./schema";

/** Bagian konteks wedding yang menentukan akses pengguna. */
export type AccessContext = {
  role: MemberRole;
  status: "active" | "archived";
  permissions: Permissions;
};

/**
 * Tingkat akses pengguna pada satu modul. Hanya untuk menentukan apa yang
 * ditampilkan: otorisasi sebenarnya ada di RLS lewat `private.has_access()`,
 * dan aturan di sini harus sama dengannya.
 */
export function accessLevel(context: AccessContext, module: ModuleKey): AccessLevel {
  const level = context.role === "owner" ? "edit" : (context.permissions[module] ?? "none");
  return level === "edit" && context.status === "archived" ? "view" : level;
}

export function canView(context: AccessContext, module: ModuleKey): boolean {
  return accessLevel(context, module) !== "none";
}

export function canEdit(context: AccessContext, module: ModuleKey): boolean {
  return accessLevel(context, module) === "edit";
}
