import { forwardRef, InputHTMLAttributes } from "react";
import { Search } from "lucide-react";
import { cn } from "@/src/shared/lib/cn";

export interface SearchFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Render the trailing "/" keyboard-hint chip (a focus-shortcut affordance). */
  showKeyHint?: boolean;
}

/**
 * Search input with a leading icon inside a bordered box. The wrapper is the
 * visible control (and takes the focus-accent border via `focus-within`); the
 * `<input>` itself is transparent and borderless. Provide an `aria-label` or a
 * paired `<label>` for the accessible name.
 */
export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  ({ className, showKeyHint = false, type = "search", ...props }, ref) => {
    return (
      <div
        className={cn(
          "flex h-[42px] items-center gap-2.5 rounded-control border border-white/[0.08] bg-background px-[14px]",
          "transition-colors duration-150 focus-within:border-acc focus-within:ring-2 focus-within:ring-acc/40",
          className,
        )}
      >
        <Search
          size={17}
          strokeWidth={2}
          aria-hidden
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
