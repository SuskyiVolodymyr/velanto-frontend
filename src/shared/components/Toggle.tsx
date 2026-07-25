import { cn } from "@/src/shared/lib/cn";

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Accessible name, when the toggle isn't paired with a visible `<label>`. */
  ariaLabel?: string;
  /** Lets a `<label htmlFor>` target the switch. */
  id?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * On/off switch (`role="switch"`). A 44×26 track with a 20px knob that slides
 * 18px on the signature easing; the fill turns cyan when on. Motion is dropped
 * under `prefers-reduced-motion` — the knob just snaps to its position.
 */
export function Toggle({
  checked,
  onChange,
  ariaLabel,
  id,
  disabled,
  className,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-[26px] w-11 shrink-0 rounded-pill transition-colors duration-[180ms] motion-reduce:transition-none",
        "outline-none focus-visible:ring-2 focus-visible:ring-acc focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:opacity-45 disabled:pointer-events-none",
        checked ? "bg-acc" : "bg-white/[0.14]",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-[3px] h-5 w-5 rounded-pill bg-white transition-[left] duration-[180ms] [transition-timing-function:var(--ease-signature)] motion-reduce:transition-none",
          checked ? "start-[21px]" : "start-[3px]",
        )}
      />
    </button>
  );
}
