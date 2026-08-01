import type { IconProps } from "@/src/shared/components/icons/icon-types";

/**
 * A filled play triangle — pack cards, resume rail, play buttons. Fill-only
 * (no stroke), so it omits `strokeWidth` rather than silently ignoring it.
 */
export function PlayIcon({
  size = 13,
  className,
}: Omit<IconProps, "strokeWidth">) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M8 5.5v13l11-6.5z" />
    </svg>
  );
}
