import { forwardRef, InputHTMLAttributes } from "react";
import { SearchIcon } from "@/src/shared/components/icons";
import { cn } from "@/src/shared/lib/cn";

// `size` is omitted from the native attributes and redefined below: the HTML
// `size` on an <input> is a character-count width, which this control (a styled
// wrapper around a flex-filling input) has never honoured anyway. Taking the
// name lets it mean the same thing here as on Dropdown.
export interface SearchFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Render the trailing "/" keyboard-hint chip (a focus-shortcut affordance). */
  showKeyHint?: boolean;
  /**
   * Which step of the elevation ladder the field sits on. `background` (default)
   * is the field on page chrome; `card` is the field sitting on the page body,
   * one step lifted so it reads as a control rather than a hole (Suggestions).
   *
   * A whole-class swap rather than a `className` override on purpose: `cn()` is
   * a plain join, so passing `bg-surface-card` from outside would leave both
   * backgrounds in the class list and let Tailwind's emit order decide.
   */
  surface?: "background" | "card";
  /**
   * Control height. `md` (42px) is the app's standard field; `lg` (44px) is the
   * taller filter bar the staff queues use (Moderation.dc.html sizes its search
   * box, format dropdown and sort button together at 44).
   *
   * A prop rather than a `className="h-11"`, for the same reason as `surface`:
   * `cn()` is a plain join, so an outside height would leave both in the class
   * list and let Tailwind's emit order pick the winner.
   */
  size?: "md" | "lg";
}

const SURFACE_CLASS: Record<
  NonNullable<SearchFieldProps["surface"]>,
  string
> = {
  background: "bg-background",
  card: "bg-surface-card",
};

const SIZE_CLASS: Record<NonNullable<SearchFieldProps["size"]>, string> = {
  md: "h-[42px]",
  lg: "h-11",
};

/**
 * Search input with a leading icon inside a bordered box. The wrapper is the
 * visible control (and takes the focus-accent border via `focus-within`); the
 * `<input>` itself is transparent and borderless. Provide an `aria-label` or a
 * paired `<label>` for the accessible name.
 */
export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  (
    {
      className,
      showKeyHint = false,
      surface = "background",
      size = "md",
      type = "search",
      ...props
    },
    ref,
  ) => {
    return (
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-control border border-white/[0.08] px-[14px]",
          SIZE_CLASS[size],
          SURFACE_CLASS[surface],
          "transition-colors duration-150 focus-within:border-acc focus-within:ring-2 focus-within:ring-acc/40",
          className,
        )}
      >
        <SearchIcon
          size={17}
          strokeWidth={2}
          className="shrink-0 text-foreground-tertiary"
        />
        <input
          ref={ref}
          type={type}
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-tertiary"
          {...props}
        />
        {showKeyHint && (
          <kbd
            data-mono
            aria-hidden
            className="rounded-[6px] border border-white/10 px-1.5 py-0.5 text-[11px] text-foreground-tertiary"
          >
            /
          </kbd>
        )}
      </div>
    );
  },
);

SearchField.displayName = "SearchField";
