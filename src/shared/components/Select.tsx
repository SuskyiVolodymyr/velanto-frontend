import { SelectHTMLAttributes, forwardRef } from "react";
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
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "h-11 w-full rounded-[10px] bg-surface border border-border px-4",
          "text-sm text-foreground",
          "transition-colors duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc",
          "disabled:opacity-45 disabled:pointer-events-none",
          className,
        )}
        {...props}
      >
        {options
          ? options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))
          : children}
      </select>
    );
  },
);

Select.displayName = "Select";
