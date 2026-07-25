import { cn } from "@/src/shared/lib/cn";

export interface ProgressBarProps {
  /** Completion percentage, 0–100 (clamped). */
  value: number;
  /** Accessible name for the progressbar (e.g. "Round 3 of 11"). */
  ariaLabel?: string;
  className?: string;
}

/**
 * A thin determinate progress track with a cyan fill. Used by the resume card
 * ("Round 3 of 11") and anywhere a 0–100 completion needs showing. For an
 * indeterminate busy state use {@link LoadingState}/{@link Spinner} instead.
 */
export function ProgressBar({ value, ariaLabel, className }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      className={cn(
        "h-1 overflow-hidden rounded-pill bg-white/[0.08]",
        className,
      )}
    >
      <div
        className="h-full rounded-pill bg-acc transition-[width] duration-300 ease-[var(--ease-signature)] motion-reduce:transition-none"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
