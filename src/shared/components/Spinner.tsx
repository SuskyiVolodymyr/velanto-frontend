import { Loader2 } from "lucide-react";
import { cn } from "@/src/shared/lib/cn";

export interface SpinnerProps {
  /** Diameter in px. Defaults to 18 (inline / button size). */
  size?: number;
  className?: string;
}

/**
 * A decorative spinning indicator (lucide Loader2). It is `aria-hidden` and
 * carries no accessible text of its own, so pair it with visible text (a
 * button's label) or wrap it in {@link LoadingState} for a standalone loading
 * region that needs to announce a busy status. Inherits `currentColor`, so it
 * tints to whatever text color its context sets.
 */
export function Spinner({ size = 18, className }: SpinnerProps) {
  return (
    <Loader2
      aria-hidden
      className={cn("animate-spin", className)}
      size={size}
      strokeWidth={2.2}
    />
  );
}
