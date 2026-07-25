import type { ReactNode } from "react";
import { cn } from "@/src/shared/lib/cn";

export interface EmptyStateProps {
  /** Optional icon rendered in the tile above the message. */
  icon?: ReactNode;
  title: string;
  description?: string;
  /** Optional action (e.g. a "Clear filters" Button). */
  action?: ReactNode;
  className?: string;
}

/**
 * The dashed "nothing here yet" placeholder. Always states what the user can do
 * next (a `description` and/or an `action`) rather than a bare "No results" —
 * the dashed border reads as an intentional empty slot, not a broken panel.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2.5 rounded-tile border border-dashed border-white/[0.14] px-[18px] py-[30px] text-center",
        className,
      )}
    >
      {icon && (
        <span
          aria-hidden
          className="grid h-[42px] w-[42px] place-items-center rounded-[13px] bg-white/[0.05] text-foreground-tertiary"
        >
          {icon}
        </span>
      )}
      <p className="text-sm font-[650] text-foreground">{title}</p>
      {description && (
        <p className="max-w-[42ch] text-[12.5px] text-foreground-tertiary">
          {description}
        </p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
