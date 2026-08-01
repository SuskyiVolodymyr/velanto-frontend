import type { IconProps } from "@/src/shared/components/icons/icon-types";

/** The "Filters" popover trigger — stacked bars. */
export function SlidersIcon({
  size = 14,
  strokeWidth = 2,
  className,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      aria-hidden
      className={className}
    >
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  );
}
