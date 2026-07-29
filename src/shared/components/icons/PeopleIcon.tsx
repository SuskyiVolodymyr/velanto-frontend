import type { IconProps } from "@/src/shared/components/icons/icon-types";

/** Sidebar nav — People (a head + shoulders, with a checkmark). */
export function PeopleIcon({
  size = 18,
  strokeWidth = 1.8,
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
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
      <path d="M19 11.5l1.6 1.6L23 10.7" />
    </svg>
  );
}
