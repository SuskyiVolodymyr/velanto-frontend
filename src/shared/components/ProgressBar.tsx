import { cn } from "@/src/shared/lib/cn";

export interface ProgressBarProps {
  /** Completion percentage, 0–100 (clamped). */
  value: number;
  /** Accessible name for the progressbar (e.g. "Round 3 of 11"). */
  ariaLabel?: string;
  className?: string;
  /**
   * `"bar"` (default) — `h-1`, pill-rounded ends, for compact decorations
   * like the result tables' ranking rows.
   * `"rail"` — `h-[3px]`, square ends, for the full-bleed play-screen
   * progress rail. Radius is chosen per-size rather than appended via
   * `className`, since `cn()` is a plain join (not tailwind-merge) — see
   * `Text.tsx` for why appending a conflicting utility class can't be relied
   * on to override an earlier one.
   */
  size?: "bar" | "rail";
}

/**
 * A thin determinate progress track with a cyan fill, for anywhere a 0–100
 * completion or relative magnitude needs showing (e.g. the result screens'
 * ranking tables). For an indeterminate busy state use
 * {@link LoadingState}/{@link Spinner} instead.
 */
export function ProgressBar({
  value,
  ariaLabel,
  className,
  size = "bar",
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  const isRail = size === "rail";
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      className={cn(
        isRail ? "h-[3px]" : "h-1 rounded-pill",
        "overflow-hidden bg-white/[0.08]",
        className,
      )}
    >
      <div
        className={cn(
          "h-full bg-acc transition-[width] duration-300 ease-[var(--ease-signature)] motion-reduce:transition-none",
          isRail ? "" : "rounded-pill",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
