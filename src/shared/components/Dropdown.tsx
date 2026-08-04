"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/src/shared/lib/cn";

export interface DropdownOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface DropdownProps<T extends string> {
  options: DropdownOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Shown on the trigger while nothing is selected. */
  placeholder?: string;
  /**
   * Names the dimension on the trigger, ahead of the selected value
   * ("Language: All"). For filter bars, where a trigger showing only its value
   * reads as a statement about the results rather than a control — "Popular"
   * gives no hint that anything else is on offer.
   *
   * Trigger only: the options themselves stay unprefixed, so the list is not
   * eleven repetitions of the same word.
   */
  prefix?: string;
  /** Accessible name for the control. */
  ariaLabel?: string;
  /** Points the trigger at an inline error/description element. */
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
  /**
   * Trigger height, radius and text size — one prop, because they vary
   * together. `sm` (34px, pill) is the browse bar's filter row; `md` (42px) is
   * the app's standard field; `lg` (44px) is the
   * taller staff filter bar (Moderation.dc.html sizes search + format + sort
   * together at 44). The floating panel positions itself off the trigger, so it
   * follows either.
   */
  size?: "sm" | "md" | "lg";
  /**
   * Which step of the elevation ladder the trigger sits on — `background`
   * (default) for a field in a form, `card` for one in a filter bar sitting on
   * the page body, where a background-coloured control reads as a hole.
   *
   * Both this and `size` are props rather than `className` overrides: `cn()` is
   * a plain join, so an outside `h-11`/`bg-surface-card` would leave both
   * values in the class list and let Tailwind's emit order decide.
   */
  surface?: "background" | "card";
  /**
   * How tall the floating panel may get before it scrolls. `default` (280px)
   * suits the short lists this was built for; `tall` (440px) fits the eleven
   * pack languages plus "All" without a scrollbar.
   *
   * A prop, not a className: the panel is an inner element, and cn() is a plain
   * join, so two max-heights would both emit.
   */
  panelHeight?: "default" | "tall";
}

// Radius lives here rather than in the shared base class because it is not
// independent of size: `sm` is the browse bar's filter pill, which is fully
// round to sit level with the format chips beside it, while the field sizes
// keep the form control radius. cn() is a plain join, so the two radii must
// never both be emitted.
const TRIGGER_SIZE_CLASS: Record<"sm" | "md" | "lg", string> = {
  sm: "h-[34px] rounded-pill text-[13px]",
  md: "h-[42px] rounded-control",
  lg: "h-11 rounded-control",
};

const PANEL_HEIGHT_CLASS: Record<"default" | "tall", string> = {
  default: "max-h-[280px]",
  tall: "max-h-[440px]",
};

const TRIGGER_SURFACE_CLASS: Record<"background" | "card", string> = {
  background: "bg-background",
  card: "bg-surface-card",
};

/**
 * The design's own dropdown (Components.dc.html → "Dropdown · long or localized
 * lists"): a 42px trigger with a chevron, and a floating panel of 34px rows
 * where the selected one is filled and carries an accent check.
 *
 * A real listbox rather than a native `<select>`. The native control renders its
 * option list with OS chrome that ignores every token in the app — on a dark
 * page it opens as a light system menu with the wrong type, radii, and highlight
 * colour, which is exactly what this replaces. Keyboard behaviour follows the
 * WAI-ARIA listbox pattern: Enter/Space/Arrow opens, arrows move the active
 * option, Enter/Space commits, Escape closes and returns focus to the trigger.
 */
export function Dropdown<T extends string>({
  options,
  value,
  onChange,
  placeholder,
  prefix,
  ariaLabel,
  "aria-describedby": ariaDescribedby,
  "aria-invalid": ariaInvalid,
  disabled = false,
  id,
  className,
  size = "md",
  surface = "background",
  panelHeight = "default",
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  // Which option the keyboard is on. Kept apart from `value`: moving through the
  // list must not commit anything until Enter (a native select on desktop
  // behaves the same when opened).
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const optionId = useId();

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function openList() {
    if (disabled) return;
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  }

  function commit(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  /** Next selectable option in `step` direction, skipping disabled entries. */
  function move(from: number, step: number) {
    for (let hop = 1; hop <= options.length; hop += 1) {
      const next =
        (from + step * hop + options.length * options.length) % options.length;
      if (!options[next].disabled) return next;
    }
    return from;
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (disabled) return;
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        openList();
      }
      return;
    }
    switch (event.key) {
      case "Escape":
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        break;
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((index) => move(index, 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) => move(index, -1));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(move(-1, 1));
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(move(0, -1));
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        commit(activeIndex);
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        break;
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={
          open && activeIndex >= 0 ? `${optionId}-${activeIndex}` : undefined
        }
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedby}
        aria-invalid={ariaInvalid}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex w-full cursor-pointer items-center justify-between gap-2 border px-[13px] font-semibold transition-colors",
          TRIGGER_SIZE_CLASS[size],
          TRIGGER_SURFACE_CLASS[surface],
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc",
          "disabled:cursor-not-allowed disabled:opacity-45",
          open ? "border-acc" : "border-white/[0.12] hover:border-white/25",
          selected ? "text-foreground" : "text-foreground-tertiary",
        )}
      >
        <span className="truncate">
          {prefix && (
            <span className="font-medium text-foreground-secondary">
              {prefix}:{" "}
            </span>
          )}
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          aria-hidden
          size={14}
          strokeWidth={2.2}
          className={cn(
            "flex-none text-foreground-tertiary transition-transform duration-150",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className={cn(
            "absolute inset-x-0 top-[calc(100%+4px)] z-30 overflow-y-auto rounded-control border border-white/[0.12] bg-surface-raised p-1.5 shadow-[0_18px_44px_rgba(0,0,0,0.55)]",
            PANEL_HEIGHT_CLASS[panelHeight],
          )}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <div
                key={option.value}
                id={`${optionId}-${index}`}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled || undefined}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => commit(index)}
                className={cn(
                  "flex h-[34px] cursor-pointer items-center justify-between gap-2.5 rounded-chip px-2.5 text-[13px] font-semibold",
                  option.disabled && "cursor-not-allowed opacity-45",
                  isSelected
                    ? "bg-white/[0.06] text-foreground"
                    : "text-foreground-secondary",
                  // The keyboard's position, distinct from the selection so you
                  // can see where Enter will land before it lands there.
                  !option.disabled &&
                    index === activeIndex &&
                    !isSelected &&
                    "bg-white/[0.03] text-foreground",
                )}
              >
                {option.label}
                {isSelected && (
                  <Check
                    aria-hidden
                    size={13}
                    strokeWidth={2.6}
                    className="flex-none text-acc"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
