import type { IconProps } from "@/src/shared/components/icons/icon-types";

/** A downward caret — dropdown/sort/account-menu triggers. */
export function ChevronDownIcon({
  size = 13,
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
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
