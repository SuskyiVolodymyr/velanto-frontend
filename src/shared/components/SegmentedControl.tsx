import { KeyboardEvent, useRef } from "react";
import { cn } from "@/src/shared/lib/cn";

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
  /**
   * Overrides this option's accessible name (defaults to `label`). Needed when
   * the same control repeats many times on a page (e.g. one per row) and each
   * instance's options need a disambiguating name of their own, distinct from
   * the short visible label.
   */
  ariaLabel?: string;
  /**
   * How this option fills when it is the selected one. `neutral` (default) is
   * the plain raised chip; `accent` gives it the app's cyan, for an option that
   * means "this is switched ON" rather than merely "this is the current
   * choice" — an On/Off pair reads as a switch, and a switch should show its
   * live state in the same colour every other live control uses.
   */
  tone?: "neutral" | "accent";
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the group; applied to the `role="radiogroup"` wrapper. */
  ariaLabel?: string;
  className?: string;
  /** Applied to the `role="radiogroup"` wrapper so a `<label htmlFor>` can target it. */
  id?: string;
  /** Points the radiogroup at an inline error/description element (e.g. `${id}-error`). */
  "aria-describedby"?: string;
  /** Marks the radiogroup invalid for assistive tech when the field is errored. */
  "aria-invalid"?: boolean;
  /**
   * Split the group's width evenly between its options instead of sizing each
   * to its own label. For a caller that gives the group a fixed width: without
   * this the content-sized segments leave the slack as dead space at the end,
   * which reads as a lopsided gap on one side.
   */
  stretch?: boolean;
}

// Single-select toggle-button group. Uses radiogroup/radio semantics
// (`role="radiogroup"` + `role="radio"`/`aria-checked`) rather than the
// `aria-pressed` toggle pattern the codebase hand-rolls today: only one option
// can be active at a time, which is exactly what a radio group models. Radios
// share a roving tabindex and support arrow-key navigation per the WAI-ARIA
// radiogroup pattern.
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
  id,
  "aria-describedby": ariaDescribedby,
  "aria-invalid": ariaInvalid,
  stretch = false,
}: SegmentedControlProps<T>) {
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  function selectByOffset(currentIndex: number, offset: number) {
    const count = options.length;
    // Step over disabled options; bail after a full loop to avoid infinite spin.
    for (let step = 1; step <= count; step += 1) {
      const nextIndex = (currentIndex + offset * step + count * count) % count;
      const option = options[nextIndex];
      if (!option.disabled) {
        onChange(option.value);
        buttonsRef.current[nextIndex]?.focus();
        return;
      }
    }
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        selectByOffset(index, 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        selectByOffset(index, -1);
        break;
      default:
        break;
    }
  }

  return (
    <div
      role="radiogroup"
      id={id}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedby}
      aria-invalid={ariaInvalid}
      className={cn(
        "inline-flex self-start gap-1 rounded-control border border-white/[0.08] bg-background p-[3px]",
        className,
      )}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              buttonsRef.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.ariaLabel}
            disabled={option.disabled}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "h-[34px] rounded-[9px] text-[13px] font-semibold transition-colors",
              "outline-none focus-visible:ring-2 focus-visible:ring-acc",
              "disabled:opacity-45 disabled:pointer-events-none",
              // Exactly one width rule: cn() is a plain join, so a stretched
              // segment must not also carry the content padding, or both would
              // emit and Tailwind's order would pick the winner.
              stretch ? "flex-1 px-2" : "px-4",
              !selected &&
                "bg-transparent text-white/50 hover:text-foreground-secondary",
              selected &&
                (option.tone === "accent"
                  ? "bg-acc text-[#07131a]"
                  : "bg-white/10 text-foreground"),
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
