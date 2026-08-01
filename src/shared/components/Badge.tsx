import { HTMLAttributes } from "react";
import { cn } from "@/src/shared/lib/cn";

export type BadgeVariant = "default" | "accent" | "overlay";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

// A pill label — fill + text, no border. One meaning per colour (design rule 3).
// `default` is the neutral pill; `accent` is cyan; `overlay` is the glass pill
// for badges sitting on cover art (dark scrim + blur, readable over any image).
const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-white/[0.07] text-foreground-secondary",
  accent: "bg-acc/[0.16] text-acc-hover",
  overlay: "bg-black/55 text-white/95 backdrop-blur-sm",
};

export function Badge({
  variant = "default",
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill px-2.5 py-1 text-[11px] font-bold tracking-[0.04em]",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
