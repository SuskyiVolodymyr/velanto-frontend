import { ElementType, HTMLAttributes } from "react";
import { cn } from "@/src/shared/lib/cn";

export type TextVariant =
  "title" | "body" | "secondary" | "tertiary" | "danger";

export interface TextProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  variant?: TextVariant;
}

/**
 * Every variant sets exactly one text colour, and that is load-bearing.
 *
 * `cn()` is a plain join, not tailwind-merge, so a caller passing
 * `className="text-danger"` does NOT replace the variant's colour — it appends
 * a second one. Two utilities of equal specificity means the cascade decides by
 * stylesheet order, not class-attribute order, and `text-foreground` wins every
 * time. Measured in a browser: `text-danger` alone is rgb(255,107,107), but
 * `text-foreground text-danger` is rgb(243,245,248) in EITHER order.
 *
 * That is why `danger` is a variant rather than something callers hand in via
 * className (velanto-frontend#236): every error message in the app was rendering
 * near-white, and the class string said "text-danger" so it read as correct in
 * both the source and the tests.
 *
 * Adding a colour here? It must be a variant. Never expect a className colour to
 * override one of these.
 */
const variantClasses: Record<TextVariant, string> = {
  title: "text-foreground font-semibold tracking-[-0.02em]",
  body: "text-foreground tracking-[-0.01em]",
  secondary: "text-foreground-secondary tracking-[-0.01em]",
  tertiary: "text-foreground-tertiary tracking-[-0.01em]",
  // Error / destructive copy (--danger, see app/globals.css).
  danger: "text-danger tracking-[-0.01em]",
};

export function Text({
  as: Component = "p",
  variant = "body",
  className,
  ...props
}: TextProps) {
  return (
    <Component className={cn(variantClasses[variant], className)} {...props} />
  );
}
