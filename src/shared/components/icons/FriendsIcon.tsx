import type { IconProps } from "@/src/shared/components/icons/icon-types";

/** Two-person glyph — the pack card's "play with friends" room-create button. */
export function FriendsIcon({
  size = 15,
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
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M16 20v-1.6a3.4 3.4 0 0 0-3.4-3.4H6.4A3.4 3.4 0 0 0 3 18.4V20" />
      <circle cx="9.5" cy="7.5" r="3.2" />
      <path d="M21 20v-1.6a3.4 3.4 0 0 0-2.6-3.3" />
    </svg>
  );
}
