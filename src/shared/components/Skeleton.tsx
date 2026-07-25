import type { HTMLAttributes } from "react";
import { cn } from "@/src/shared/lib/cn";

/**
 * A pulsing placeholder block for route-level loading skeletons. Decorative
 * (`aria-hidden`) — the surrounding `loading.tsx` is announced by the router's
 * own pending state, so individual blocks add no screen-reader value. Size it
 * with utility classes via `className` (e.g. `h-8 w-40`).
 */
export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-shimmer rounded-[10px] [background-size:320px_100%] bg-[linear-gradient(90deg,#1b1f28_25%,#242935_50%,#1b1f28_75%)]",
        className,
      )}
      {...props}
    />
  );
}
