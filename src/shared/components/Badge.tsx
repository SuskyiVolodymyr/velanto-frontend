import { HTMLAttributes } from "react";
import { cn } from "@/src/shared/lib/cn";

export type BadgeVariant = "default" | "accent" | "overlay";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-white/[0.04] text-foreground-secondary border border-border",
  accent: "bg-acc/10 text-acc border border-acc/30",
  // Readable over any cover image (light or dark): dark scrim + blur + white
  // text. Used for badges overlaid on pack cover art.
  overlay: "bg-black/50 text-white/95 border border-white/20 backdrop-blur-sm",
};

export function Badge({
  variant = "default",
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[8px] px-2.5 py-1 text-xs font-medium tracking-[-0.01em]",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
