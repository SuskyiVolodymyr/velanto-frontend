import type { Role } from "@/src/shared/types/user";

/** Elevated roles that get the animated gradient nickname + verified badge. */
const STAFF_ROLES = new Set<Role>(["admin", "manager", "moderator"]);

export function isStaff(role: Role | null | undefined): boolean {
  return role != null && STAFF_ROLES.has(role);
}

/**
 * Whether a user shows the verified badge. Staff are verified by default (in
 * addition to any user explicitly flagged `trusted`), matching the backend rule
 * where staff and trusted authors both bypass pack moderation.
 */
export function isVerified(user: {
  role?: Role | null;
  trusted?: boolean | null;
}): boolean {
  return Boolean(user.trusted) || isStaff(user.role);
}

/** The globals.css gradient modifier class for a staff role, else undefined. */
const ROLE_NICKNAME_CLASS: Partial<Record<Role, string>> = {
  admin: "nickname-admin",
  manager: "nickname-manager",
  moderator: "nickname-moderator",
};

export function roleNicknameClass(
  role: Role | null | undefined,
): string | undefined {
  return role ? ROLE_NICKNAME_CLASS[role] : undefined;
}

/**
 * Display copy for the role feature. Hardcoded English on purpose — same
 * convention as the auth validation messages (auth.schema.ts); these short
 * role words are not localized.
 */
export const ROLE_LABELS: Partial<Record<Role, string>> = {
  admin: "Admin",
  manager: "Manager",
  moderator: "Moderator",
};

export const TRUSTED_TOOLTIP = "Trusted user";
