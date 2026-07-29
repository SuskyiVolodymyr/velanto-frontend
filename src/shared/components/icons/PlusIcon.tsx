import type { IconProps } from "@/src/shared/components/icons/icon-types";

/** The "Create" button's plus glyph. */
export function PlusIcon({
  size = 16,
  strokeWidth = 2.4,
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
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
