import { cn } from "@/src/shared/lib/cn";
import { Spinner } from "./Spinner";

export interface LoadingStateProps {
  /** Announced to screen readers; shown as visible text when `showLabel`. */
  label: string;
  /** Render the label next to the spinner (default: icon only, label sr-only). */
  showLabel?: boolean;
  /** Spinner diameter in px. Defaults to 28 (component/page size). */
  size?: number;
  className?: string;
}

/**
 * A standalone loading region: a centered {@link Spinner} inside a
 * `role="status"` live region that announces a busy state to screen readers.
 * Use it in place of the bare "Loading…" text that component and page bodies
 * show while their data loads.
 */
export function LoadingState({
  label,
  showLabel = false,
  size = 28,
  className,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-center justify-center gap-3 py-10 text-foreground-tertiary",
        className,
      )}
    >
      <Spinner size={size} />
      <span className={showLabel ? "text-sm" : "sr-only"}>{label}</span>
    </div>
  );
}
