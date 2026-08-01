"use client";

import type { ReactNode } from "react";
import { cn } from "@/src/shared/lib/cn";

export interface ComposerChoice<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  /** Border + fill + text applied when this option is the selected one. */
  activeClass: string;
}

/**
 * The composer's wrapping choice row — topics and translation languages both use
 * it. Real `radiogroup`/`radio` semantics (not the `aria-pressed` toggles the
 * filter chips use): exactly one option can be selected and the group answers a
 * question, which is what a radio group models.
 *
 * Each option carries its OWN active class string rather than the row applying
 * one shared highlight, because the composer tints a chosen topic in that
 * topic's hue. `cn()` is a plain join, so idle and active are whole alternative
 * strings — never a base plus an override.
 */
export function ComposerChoiceRow<T extends string>({
  options,
  value,
  onSelect,
  ariaLabel,
  id,
  "aria-describedby": ariaDescribedby,
  "aria-invalid": ariaInvalid,
}: {
  options: ComposerChoice<T>[];
  value: T | "";
  onSelect: (value: T) => void;
  ariaLabel: string;
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      id={id}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedby}
      aria-invalid={ariaInvalid}
      className="flex flex-wrap gap-2"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected || (!value && options[0] === option) ? 0 : -1}
            onClick={() => onSelect(option.value)}
            className={cn(
              "inline-flex h-9 cursor-pointer items-center gap-[7px] rounded-[10px] border px-[13px] text-[12.5px] font-[650] transition-colors",
              "outline-none focus-visible:ring-2 focus-visible:ring-acc",
              selected
                ? option.activeClass
                : "border-white/[0.09] bg-white/[0.03] text-foreground-secondary hover:text-foreground",
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
