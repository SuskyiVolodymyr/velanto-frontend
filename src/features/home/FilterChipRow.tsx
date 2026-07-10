"use client";

import { cn } from "@/src/shared/lib/cn";

// Presentational single-select chip row shared by the format, sort and window
// filters — same button styling and aria-pressed semantics for each group.
export function FilterChipRow<T extends string>({
  options,
  value,
  onSelect,
}: {
  options: { value: T; label: string }[];
  value: T;
  onSelect: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onSelect(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            "rounded-[9px] border px-3 py-1.5 text-sm font-medium transition-colors",
            value === option.value
              ? "border-acc/30 bg-acc/10 text-acc"
              : "border-border bg-white/[0.03] text-foreground-secondary",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
