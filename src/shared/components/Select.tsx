import { SelectHTMLAttributes, forwardRef } from "react";
import { useFieldIdentity } from "@/src/shared/lib/use-field-identity";
import { ChevronDown } from "lucide-react";
import { cn } from "@/src/shared/lib/cn";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /**
   * Convenience prop to render `<option>`s from data. When omitted, `children`
   * are rendered instead so callers can hand-author options (e.g. grouped or
   * with a placeholder). Provide one or the other, not both.
   */
  options?: SelectOption[];
}

// Styled native `<select>` — native for a11y + SSR safety. The accessible name
// is the caller's responsibility: pass `id` (paired with a `<label htmlFor>`)
// or `aria-label`; both flow through via `...props`.
//
// The browser's default arrow is suppressed (`appearance-none`) and replaced
// with our own chevron sitting in a bordered box inset from the edge, so it
// reads as a deliberate control affordance rather than crammed against the
// frame. `className` lands on the wrapper (it's the layout box — e.g. a caller's
// `md:hidden`); the `<select>` fills it. Logical properties (`pe-*`, `end-0`,
// `border-s`) keep the arrow on the correct side under RTL locales.
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, children, id, name, ...props }, ref) => {
    const fieldId = useFieldIdentity(id, name);
    return (
      <div className={cn("relative w-full", className)}>
        <select
          ref={ref}
          id={fieldId}
          name={name}
          className={cn(
            "h-11 w-full appearance-none rounded-[10px] border border-border bg-surface",
            // Extra inline-end padding clears the arrow box so long option text
            // never runs underneath it.
            "ps-4 pe-12 text-sm text-foreground",
            "transition-colors duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc",
            "disabled:pointer-events-none disabled:opacity-45",
          )}
          {...props}
        >
          {options
            ? options.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </option>
              ))
            : children}
        </select>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 end-0 flex items-center border-s border-border px-3 text-foreground-secondary"
        >
          <ChevronDown size={16} strokeWidth={2} />
        </span>
      </div>
    );
  },
);

Select.displayName = "Select";
