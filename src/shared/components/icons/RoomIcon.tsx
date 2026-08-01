import type { IconProps } from "@/src/shared/components/icons/icon-types";

/** "Join a room" card — a code-entry screen glyph. */
export function RoomIcon({
  size = 17,
  strokeWidth = 1.9,
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
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M8 12h.01M12 12h.01M16 12h.01" />
    </svg>
  );
}
