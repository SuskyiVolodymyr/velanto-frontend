import type { IconProps } from "@/src/shared/components/icons/icon-types";

/** Pagination — previous page. */
export function ChevronLeftIcon({
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
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}
