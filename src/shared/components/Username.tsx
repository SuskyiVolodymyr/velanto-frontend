import { cn } from "@/src/shared/lib/cn";
import { identityPill, nicknameClass } from "@/src/shared/lib/user-role";
import type { Role } from "@/src/shared/types/user";

export interface UsernameProps {
  username: string;
  /** Author/user role; staff roles get their animated gradient handle. */
  role?: Role | null;
  /** Raw trusted flag; a trusted non-staff user gets the green trusted handle. */
  trusted?: boolean | null;
  /** Prepend "@" to the handle. */
  at?: boolean;
  /** Show the role/trust pill — only on the profile page + author hover card. */
  showRole?: boolean;
  /** Extra classes for the handle text itself. */
  className?: string;
}

/**
 * Canonical rendering of a user handle across the app. Staff (admin/manager/
 * moderator) and trusted non-staff users get an animated gradient nickname (the
 * gradient itself is the always-visible trust signal); the ALL-CAPS role/TRUSTED
 * pill appears only where `showRole` is set (profile + author hover card).
 *
 * No interactivity, so it renders on the server — streamer-mode name hiding
 * (`<Hidden>`) and any profile link stay the caller's responsibility, matching
 * how handles are wired today (a handle is often a <Link> already in <Hidden>).
 */
export function Username({
  username,
  role,
  trusted,
  at = false,
  showRole = false,
  className,
}: UsernameProps) {
  const gradient = nicknameClass({ role, trusted });
  const pill = showRole ? identityPill({ role, trusted }) : null;
  const display = at ? `@${username}` : username;

  return (
    <span className="inline-flex items-center gap-1.5">
      {/* `nickname-gradient` carries the animation/clip; the identity modifier
          (`nickname-admin`/`nickname-trusted` …) supplies the per-role colors —
          both are required for the gradient to render. */}
      <span
        className={cn(
          "font-bold",
          gradient && "nickname-gradient",
          gradient,
          className,
        )}
      >
        {display}
      </span>

      {pill && (
        <span
          className={cn(
            "inline-flex items-center gap-[5px] rounded-pill border px-2.5 py-[3px] text-[11px] font-bold tracking-[0.04em]",
            pill.className,
          )}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className="flex-none"
          >
            <path d={pill.iconPath} />
          </svg>
          {pill.label}
        </span>
      )}
    </span>
  );
}
