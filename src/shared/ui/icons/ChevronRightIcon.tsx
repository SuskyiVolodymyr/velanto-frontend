import type { IconProps } from "@/shared/ui/icons/icon-types";

/** Pagination — next page. */
export function ChevronRightIcon({
  size = 15,
  strokeWidth = 2.2,
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
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
