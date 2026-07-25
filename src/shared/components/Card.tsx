import { HTMLAttributes } from "react";
import { cn } from "@/src/shared/lib/cn";

export type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card bg-surface-card border border-border p-[18px]",
        "transition-[transform,border-color] duration-[180ms] ease-[var(--ease-signature)]",
        // Elevation cue is a lightening border, not a shadow (flat on the base).
        "hover:-translate-y-[3px] hover:border-white/[0.18]",
        className,
      )}
      {...props}
    />
  );
}
