"use client";

import { Dropdown } from "@/src/shared/components/Dropdown";
import type { Role } from "@/src/shared/types/user";
import {
  assignableRolesFor,
  type AssignableRole,
} from "@/src/shared/lib/staff-permissions";

interface RoleSelectProps {
  /** The acting admin/manager's role — decides what can be granted. */
  actorRole: Role;
  /** The row user's current role — the selected value. */
  targetRole: Role;
  /** Pre-resolved (and streamer-mode-aware) accessible label. */
  ariaLabel: string;
  pending?: boolean;
  onChange: (role: AssignableRole) => void;
}

/**
 * A role dropdown gated by the RBAC hierarchy: it offers only the roles this
 * actor may grant to this target (promote or demote), never 'admin'. When the
 * actor can't act on the target — a peer or superior — there is nothing to
 * grant, so it renders a static badge instead of an empty control.
 *
 * The gating here is UX-only; the backend re-validates every role change. Shared
 * by the Users tab (inline per-row) and available to the Staff tab.
 */
export function RoleSelect({
  actorRole,
  targetRole,
  ariaLabel,
  pending = false,
  onChange,
}: RoleSelectProps) {
  const options = assignableRolesFor(actorRole, targetRole).filter(
    (role) => role !== targetRole,
  );

  if (options.length === 0) {
    return (
      <span className="w-fit rounded-md bg-white/[0.06] px-2 py-1 text-[11px] font-bold uppercase tracking-[0.05em] text-foreground-secondary">
        {targetRole}
      </span>
    );
  }

  return (
    <Dropdown<Role>
      value={targetRole}
      disabled={pending}
      onChange={(role) => onChange(role as AssignableRole)}
      ariaLabel={ariaLabel}
      size="sm"
      surface="card"
      className="w-fit"
      options={[
        // The current role must be present as the selected option, or the
        // control renders blank whenever the target holds a role above what
        // this actor may grant. Disabled so it can't be re-picked as a no-op.
        { value: targetRole, label: targetRole, disabled: true },
        ...options.map((role) => ({ value: role, label: role })),
      ]}
    />
  );
}
