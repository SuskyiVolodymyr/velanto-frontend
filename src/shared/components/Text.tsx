import { ElementType, HTMLAttributes } from "react";
import { cn } from "@/src/shared/lib/cn";

export type TextVariant = "title" | "body" | "secondary" | "tertiary";

export interface TextProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  variant?: TextVariant;
}

const variantClasses: Record<TextVariant, string> = {
  title: "text-foreground font-semibold tracking-[-0.02em]",
  body: "text-foreground tracking-[-0.01em]",
  secondary: "text-foreground-secondary tracking-[-0.01em]",
  tertiary: "text-foreground-tertiary tracking-[-0.01em]",
};

export function Text({
  as: Component = "p",
  variant = "body",
  className,
  ...props
}: TextProps) {
  return <Component className={cn(variantClasses[variant], className)} {...props} />;
}
