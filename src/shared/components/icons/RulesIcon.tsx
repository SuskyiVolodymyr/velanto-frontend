import type { IconProps } from "@/src/shared/components/icons/icon-types";

/** Sidebar nav — Rules (a shield with a checkmark). */
export function RulesIcon({
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
      <path d="M12 3l8 4v5c0 4.6-3.2 8.2-8 9-4.8-.8-8-4.4-8-9V7z" />
      <path d="M9.5 12l1.8 1.8L15 10" />
    </svg>
  );
}
