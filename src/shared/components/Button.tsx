import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/src/shared/lib/cn";
import { Spinner } from "./Spinner";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";
export type ButtonSize = "md" | "sm" | "xs";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** md = 44px (default), sm = 38px, xs = 34px. */
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
  "inline-flex items-center justify-center gap-2 rounded-control " +
  "transition-[background-color,border-color,color,filter] duration-150 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "disabled:cursor-not-allowed disabled:pointer-events-none " +
  "disabled:bg-white/[0.05] disabled:text-white/30 disabled:border-transparent";

const sizeClasses: Record<ButtonSize, string> = {
  md: "h-11 px-[18px] text-sm",
  sm: "h-[38px] px-[14px] text-[13px]",
  xs: "h-[34px] px-3 text-[12.5px]",
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
  "bg-[#181b23] text-foreground-secondary transition-colors duration-150 " +
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
