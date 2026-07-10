import { ROLES, type Role } from "@/src/shared/types/user";

const ROLE_RANK: Record<Role, number> = {
  user: 0,
  moderator: 1,
  manager: 2,
  admin: 3,
};

/**
 * Mirrors the shape of velanto-backend's own outranks() check, but this copy
 * is UX-only — it only decides which buttons render. The backend
 * re-validates every request regardless of what the client shows.
 */
function outranks(actor: Role, target: Role): boolean {
  return ROLE_RANK[actor] > ROLE_RANK[target];
}

export type AssignableRole = Exclude<Role, "admin">;

// 'admin' is deliberately excluded — it can never be granted through any
// endpoint, only via direct database/terminal access. Derived from the
// canonical ROLES list so it stays in sync if a new role is added.
const ASSIGNABLE_ROLES: AssignableRole[] = ROLES.filter(
  (role): role is AssignableRole => role !== "admin",
);

export function canActOn(actorRole: Role, targetRole: Role): boolean {
  return outranks(actorRole, targetRole);
}

export function assignableRolesFor(
  actorRole: Role,
  targetRole: Role,
): AssignableRole[] {
  if (!outranks(actorRole, targetRole)) return [];
  return ASSIGNABLE_ROLES.filter((role) => outranks(actorRole, role));
}
