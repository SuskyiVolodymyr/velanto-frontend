import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/src/shared/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-[10px] h-11 px-5 " +
  "text-sm font-medium tracking-[-0.01em] transition-colors duration-200 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "disabled:opacity-45 disabled:pointer-events-none";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-acc text-background hover:brightness-110",
  secondary:
    "bg-surface text-foreground border border-border hover:border-border-strong",
  ghost: "bg-transparent text-foreground-secondary hover:text-foreground",
};

/** For non-`<button>` elements (e.g. a `Link`) that need to look like a Button. */
export function buttonClassName(variant: ButtonVariant = "primary", className?: string) {
  return cn(baseClasses, variantClasses[variant], className);
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className, type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(baseClasses, variantClasses[variant], className)}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
