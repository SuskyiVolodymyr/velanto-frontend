import type { Role } from "@/src/shared/types/user";

/** Elevated roles that get the animated gradient nickname + role pill. */
const STAFF_ROLES = new Set<Role>(["admin", "manager", "moderator"]);

export function isStaff(role: Role | null | undefined): boolean {
  return role != null && STAFF_ROLES.has(role);
}

/**
 * The identity treatment a user's handle earns. Staff (admin/manager/moderator)
 * each render their role; an explicitly `trusted` non-staff account renders as
 * "trusted"; everyone else is plain. Staff outrank the trusted flag (staff
 * bypass moderation too, but their role is the more specific signal), so a
 * trusted admin still reads as an admin.
 */
export type IdentityKind = "moderator" | "manager" | "admin" | "trusted";

export function identityKind(user: {
  role?: Role | null;
  trusted?: boolean | null;
}): IdentityKind | null {
  // isStaff() narrows role to one of the three staff strings, all of which are
  // IdentityKind members, so the assertion is total for the staff branch.
  if (isStaff(user.role)) return user.role as IdentityKind;
  if (user.trusted) return "trusted";
  return null;
}

/** The globals.css gradient modifier class for a user's identity, else undefined
 * (a plain user gets no gradient). Pair it with the base `nickname-gradient`. */
const NICKNAME_CLASS: Record<IdentityKind, string> = {
  moderator: "nickname-moderator",
  manager: "nickname-manager",
  admin: "nickname-admin",
  trusted: "nickname-trusted",
};

export function nicknameClass(user: {
  role?: Role | null;
  trusted?: boolean | null;
}): string | undefined {
  const kind = identityKind(user);
  return kind ? NICKNAME_CLASS[kind] : undefined;
}

/**
 * The role/trust pill shown beside a handle (only where the caller opts in via
 * `showRole` — the profile page and author hover card). Colors are the UI-kit v1
 * per-identity values; the label is an ALL-CAPS literal and the icon is an SVG
 * path (a role shield, or a bare check for trusted). Hardcoded English on
 * purpose — same convention as the auth validation copy; these short words and
 * the palette are not localized.
 */
export interface IdentityPill {
  label: string;
  /** Background / border / text colour utilities for the pill. */
  className: string;
  /** SVG `path` d attribute, drawn at 10px with `currentColor` stroke. */
  iconPath: string;
}

const IDENTITY_PILL: Record<IdentityKind, IdentityPill> = {
  moderator: {
    label: "MODERATOR",
    className: "bg-[rgba(0,229,255,0.16)] border-transparent text-[#8cf3ff]",
    iconPath: "M12 3l8 4v5c0 4.6-3.2 8.2-8 9-4.8-.8-8-4.4-8-9V7zM9.5 12l1.8 1.8L15 10",
  },
  manager: {
    label: "MANAGER",
    className: "bg-[rgba(124,140,255,0.16)] border-transparent text-[#b3bcff]",
    iconPath: "M12 3l8 4v5c0 4.6-3.2 8.2-8 9-4.8-.8-8-4.4-8-9V7zM8.5 12h7M12 8.5v7",
  },
  admin: {
    label: "ADMIN",
    className: "bg-[#0b0714] border-[rgba(168,85,247,0.6)] text-[#d8a6ff]",
    iconPath: "M12 3l8 4v5c0 4.6-3.2 8.2-8 9-4.8-.8-8-4.4-8-9V7zM12 8v4M12 15h.01",
  },
  trusted: {
    label: "TRUSTED",
    className: "bg-[rgba(57,217,138,0.16)] border-transparent text-[#7ee7b4]",
    iconPath: "M5 12.5l4.5 4.5L19 7",
  },
};

export function identityPill(user: {
  role?: Role | null;
  trusted?: boolean | null;
}): IdentityPill | null {
  const kind = identityKind(user);
  return kind ? IDENTITY_PILL[kind] : null;
}
