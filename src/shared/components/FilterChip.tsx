import { cn } from "@/src/shared/lib/cn";

export interface FilterChipProps {
  label: string;
  /** Whether this chip is currently active. Each chip toggles independently. */
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * A multi-select filter pill. Unlike {@link SegmentedControl} (single choice),
 * each chip toggles on its own — use a row of them for "any of these" filters.
 * The active state is an OKLab accent mix, which keeps the cyan luminous against
 * the dark base rather than muddy (a flat `bg-acc/18` reads greyer).
 */
export function FilterChip({
  label,
  selected,
  onToggle,
  disabled,
  className,
}: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "h-[34px] rounded-pill border px-[14px] text-[13px] font-semibold transition-colors",
        "outline-none focus-visible:ring-2 focus-visible:ring-acc focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:opacity-45 disabled:pointer-events-none",
        selected
          ? "border-[color-mix(in_oklab,var(--acc)_45%,transparent)] bg-[color-mix(in_oklab,var(--acc)_18%,transparent)] text-foreground"
          : "border-white/[0.09] bg-background text-foreground-secondary hover:border-white/20 hover:text-foreground",
        className,
      )}
    >
      {label}
    </button>
  );
}
