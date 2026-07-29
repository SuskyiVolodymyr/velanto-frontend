import type { IconProps } from "@/src/shared/components/icons/icon-types";

/** A filled play triangle — pack cards, resume rail, play buttons. */
export function PlayIcon({ size = 13, className }: IconProps) {
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
