"use client";

import { cn } from "@/src/shared/lib/cn";

/** `chip` = the compact rounded rectangle (sort sub-rows, My-packs status).
 *  `pill` = the UI-kit v1 browse format pill (taller, fully round). */
export type ChipVariant = "chip" | "pill";

// Presentational single-select chip row shared by the format, sort and window
// filters — same aria-pressed semantics for each group, two visual variants.
export function FilterChipRow<T extends string>({
  options,
  value,
  onSelect,
  variant = "chip",
}: {
  options: { value: T; label: string }[];
  value: T;
  onSelect: (value: T) => void;
  variant?: ChipVariant;
}) {
  // Whole classes are swapped per state (never appended) — cn() is a plain join,
  // not tailwind-merge, so overlapping utilities would both emit (the #236 trap).
  const shape =
    variant === "pill"
      ? "h-[34px] rounded-pill px-[14px] text-[13px] font-semibold"
      : "rounded-[9px] px-3 py-1.5 text-sm font-medium";
  const active =
    variant === "pill"
      ? "border-acc/45 bg-acc/[0.18] text-foreground"
      : "border-acc/30 bg-acc/10 text-acc";
  const inactive =
    variant === "pill"
      ? "border-white/[0.09] bg-surface-card text-foreground-secondary hover:text-foreground"
      : "border-border bg-white/[0.03] text-foreground-secondary";

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onSelect(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            "inline-flex items-center border transition-colors",
            shape,
            value === option.value ? active : inactive,
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
