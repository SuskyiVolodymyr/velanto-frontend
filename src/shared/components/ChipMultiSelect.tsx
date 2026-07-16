"use client";

import { cn } from "@/src/shared/lib/cn";

export interface ChipOption<T extends string> {
  readonly value: T;
  readonly label: string;
}

/**
 * Multi-select chip row: looks like the single-select `FilterChipRow`, behaves
 * like a set of checkboxes.
 *
 * Each chip wraps a **visually-hidden real checkbox**. That is deliberate and
 * is what makes "selectable pills, not checkboxes" honest rather than a
 * trade-off: sighted users get pills, and keyboard/screen-reader users get real
 * multi-select semantics — tab to a chip, space to toggle, announced as
 * checked/unchecked within a named group. A row of `aria-pressed` buttons
 * (which is what `FilterChipRow` is, correctly, for single-select) would
 * announce as unrelated toggles instead.
 *
 * Extracted from `TagPickerModal`, which invented this pattern and now shares
 * it — see the styling note there. Kept separate from `FilterChipRow` because
 * the semantics genuinely differ (`aria-pressed` button vs checkbox); they only
 * happen to look the same.
 */
export function ChipMultiSelect<T extends string>({
  options,
  selected,
  onChange,
  groupLabel,
  className,
}: {
  options: readonly ChipOption<T>[];
  selected: readonly T[];
  onChange: (next: T[]) => void;
  /** Names the group for screen readers, e.g. "Language". */
  groupLabel: string;
  className?: string;
}) {
  function toggle(value: T) {
    onChange(
      selected.includes(value)
        ? selected.filter((other) => other !== value)
        : [...selected, value],
    );
  }

  return (
    <div
      role="group"
      aria-label={groupLabel}
      className={cn("flex flex-wrap gap-2", className)}
    >
      {options.map((option) => {
        const isSelected = selected.includes(option.value);
        return (
          <label key={option.value} className="cursor-pointer">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggle(option.value)}
              className="peer sr-only"
            />
            <span
              className={cn(
                "block rounded-[9px] border px-3 py-1.5 text-sm font-medium transition-colors",
                "border-border bg-white/[0.03] text-foreground-secondary",
                "peer-checked:border-acc/30 peer-checked:bg-acc/10 peer-checked:text-acc",
                "peer-hover:border-acc/20 peer-hover:text-foreground",
                "peer-checked:peer-hover:text-acc",
                "peer-focus-visible:ring-2 peer-focus-visible:ring-acc/40",
              )}
            >
              {option.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}
