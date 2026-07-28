import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/src/shared/lib/cn";
import { Spinner } from "./Spinner";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";
export type ButtonSize = "md" | "sm" | "xs" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /**
   * md = 44px (default), sm = 38px, xs = 34px, lg = 52px.
   *
   * `lg` is the "confirm" button every play screen's round-advance control
   * uses — 52px tall, `rounded-tile` (not `rounded-control`), bold 15.5px
   * label. Its own entry in `sizeClasses` carries ALL of that (including the
   * radius), not just height/padding: `cn()` here is a plain join, not
   * tailwind-merge (see `cn.ts`), so a caller who instead tried to override
   * `baseClasses`' `rounded-control` via `className` would end up with both
   * classes present and the winner decided by Tailwind's emit order, not
   * intent. Use `size="lg"` instead of fighting the component from outside.
   */
  size?: ButtonSize;
  /**
   * Square 40px icon button: a bordered dark tile with a single centered icon.
   * Ignores `variant`/`size`; pass one icon as the child and an `aria-label`.
   */
  iconOnly?: boolean;
  /**
   * While true, prepends a spinner, disables the button, and marks it
   * `aria-busy` — so a request in flight can't be fired twice by an impatient
   * double-click. Keep the label as-is (or swap to a "…" verb); the spinner is
   * the visual cue.
   */
  loading?: boolean;
}

const baseClasses =
  "inline-flex items-center justify-center gap-2 " +
  "transition-[background-color,border-color,color,filter] duration-150 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "disabled:cursor-not-allowed disabled:pointer-events-none " +
  "disabled:bg-white/[0.05] disabled:text-white/30 disabled:border-transparent";

// Each size owns its own radius (not hoisted into `baseClasses`) so `lg` can
// use `rounded-tile` instead of the other three's `rounded-control` without
// a caller having to fight a base class via `className` — see the `size` doc
// comment above.
const sizeClasses: Record<ButtonSize, string> = {
  md: "h-11 rounded-control px-[18px] text-sm",
  sm: "h-[38px] rounded-control px-[14px] text-[13px]",
  xs: "h-[34px] rounded-control px-3 text-[12.5px]",
  lg: "h-[52px] rounded-tile px-[30px] text-[15.5px] font-semibold",
};

const variantClasses: Record<ButtonVariant, string> = {
  // Cyan fill with near-black text; hover brightens the fill (not a colour swap).
  primary: "bg-acc text-[#07131a] font-bold hover:brightness-110",
  secondary: "bg-white/[0.09] text-foreground font-[650] hover:bg-white/[0.16]",
  outline:
    "border border-border-strong text-foreground font-semibold hover:bg-white/[0.06]",
  ghost:
    "text-foreground-secondary font-semibold hover:bg-white/[0.06] hover:text-foreground",
  // Tinted destructive action (a filled red is reserved for nothing now — the
  // whole system uses tints). Red text is the lighter --danger companion.
  danger:
    "border border-danger/35 bg-danger/10 text-[#ff8c8c] font-[650] hover:bg-danger/[0.18]",
};

const iconOnlyClasses =
  "grid h-10 w-10 place-items-center rounded-control border border-white/[0.08] " +
  "bg-surface-card text-foreground-secondary transition-colors duration-150 " +
  "hover:border-white/20 hover:text-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-45";

/** For non-`<button>` elements (e.g. a `Link`) that need to look like a Button. */
export function buttonClassName(
  variant: ButtonVariant = "primary",
  className?: string,
  size: ButtonSize = "md",
) {
  return cn(baseClasses, sizeClasses[size], variantClasses[variant], className);
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      iconOnly = false,
      className,
      type = "button",
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={
          iconOnly
            ? cn(iconOnlyClasses, className)
            : cn(
                baseClasses,
                sizeClasses[size],
                variantClasses[variant],
                className,
              )
        }
        {...props}
      >
        {loading && <Spinner size={16} />}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
