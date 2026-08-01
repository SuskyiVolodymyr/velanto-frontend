import { HTMLAttributes } from "react";
import { cn } from "@/src/shared/lib/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Lift-and-lighten on hover — for clickable cards (e.g. feed pack cards).
   * Off by default: the Card component is a static panel almost everywhere, and
   * a hover cue on a non-interactive panel reads as a false affordance.
   */
  interactive?: boolean;
}

export function Card({ className, interactive = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card bg-surface-card border border-border p-[18px]",
        // Elevation cue is a lightening border, not a shadow (flat on the base).
        interactive &&
          "transition-[transform,border-color] duration-[180ms] ease-[var(--ease-signature)] hover:-translate-y-[3px] hover:border-white/[0.18]",
        className,
      )}
      {...props}
    />
  );
}
