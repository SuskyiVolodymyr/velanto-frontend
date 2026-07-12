"use client";

import { BadgeCheck } from "lucide-react";
import { Tooltip } from "@/src/shared/components/Tooltip";
import { cn } from "@/src/shared/lib/cn";
import {
  ROLE_LABELS,
  TRUSTED_TOOLTIP,
  isStaff,
  isVerified,
  roleNicknameClass,
} from "@/src/shared/lib/user-role";
import type { Role } from "@/src/shared/types/user";

export interface UsernameProps {
  username: string;
  /** Author/user role; staff roles get the animated gradient handle. */
  role?: Role | null;
  /** Raw trusted flag; combined with staff to decide the verified badge. */
  trusted?: boolean | null;
  /** Prepend "@" to the handle. */
  at?: boolean;
  /** Show the role label pill — only on the profile page + author hover card. */
  showRole?: boolean;
  /** Extra classes for the handle text itself. */
  className?: string;
}

/**
 * Canonical rendering of a user handle across the app: staff (admin/manager/
 * moderator) get an animated gradient nickname, verified users (staff or an
 * explicitly trusted account) get a BadgeCheck with a "Trusted user" tooltip,
 * and the role label appears only where `showRole` is set.
 *
 * This renders only the visual — streamer-mode name hiding (`<Hidden>`) and any
 * profile link stay the caller's responsibility, matching how handles are wired
 * today (a handle is often a <Link> already wrapped in <Hidden>).
 */
export function Username({
  username,
  role,
  trusted,
  at = false,
  showRole = false,
  className,
}: UsernameProps) {
  const staff = isStaff(role);
  const verified = isVerified({ role, trusted });
  const gradient = staff ? roleNicknameClass(role) : undefined;
  const display = at ? `@${username}` : username;

  return (
    <span className="inline-flex items-center gap-1.5">
      {/* `nickname-gradient` carries the animation/clip/glow; the role modifier
          (`nickname-admin` …) only supplies the per-role colors — both are
          required for the gradient to render. */}
      <span
        className={cn(
          "font-semibold",
          gradient && "nickname-gradient",
          gradient,
          className,
        )}
      >
        {display}
      </span>

      {verified && (
        <Tooltip content={TRUSTED_TOOLTIP}>
          <span
            role="img"
            className="inline-flex text-acc"
            aria-label={TRUSTED_TOOLTIP}
          >
            <BadgeCheck size={16} aria-hidden />
          </span>
        </Tooltip>
      )}

      {showRole && staff && role && ROLE_LABELS[role] && (
        <span className="rounded-[6px] border border-border-strong px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground-secondary">
          {ROLE_LABELS[role]}
        </span>
      )}
    </span>
  );
}
