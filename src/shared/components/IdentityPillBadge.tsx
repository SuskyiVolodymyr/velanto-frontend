import { cn } from "@/src/shared/lib/cn";
import { identityPill } from "@/src/shared/lib/user-role";
import type { Role } from "@/src/shared/types/user";

export interface IdentityPillBadgeProps {
  role?: Role | null;
  trusted?: boolean | null;
  /** Extra classes merged onto the pill itself (e.g. to counter an ancestor's `uppercase`). */
  className?: string;
}

/**
 * The ALL-CAPS role/TRUSTED pill (icon + label), built on `identityPill()`'s
 * token map. Renders nothing when the identity has no pill (a plain,
 * untrusted user). One definition shared by every caller — `Username`
 * (profile page + author hover card, gated on `showRole`) and the Admin/
 * Moderation panel headers (D2/T4, the viewer's own role) — so the pill's
 * markup can't drift between them.
 */
export function IdentityPillBadge({
  role,
  trusted,
  className,
}: IdentityPillBadgeProps) {
  const pill = identityPill({ role, trusted });
  if (!pill) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-[5px] rounded-pill border px-2.5 py-[3px] text-[11px] font-bold tracking-[0.04em]",
        pill.className,
        className,
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
  );
}
