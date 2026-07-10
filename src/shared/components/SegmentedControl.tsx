import { KeyboardEvent, useRef } from "react";
import { cn } from "@/src/shared/lib/cn";

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
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
      className={cn("flex gap-2", className)}
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
            disabled={option.disabled}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "flex-1 rounded-[12px] border px-4 py-3 text-sm font-semibold transition-colors",
              "outline-none focus-visible:ring-2 focus-visible:ring-acc",
              "disabled:opacity-45 disabled:pointer-events-none",
              selected
                ? "border-acc/40 bg-acc/5 text-foreground"
                : "border-border bg-white/[0.02] text-foreground-secondary",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
