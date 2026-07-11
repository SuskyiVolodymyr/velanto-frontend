import { cn } from "@/src/shared/lib/cn";

/**
 * Default user avatar: a tile with the first letter of the username. There is
 * no avatar-image upload yet (backend #3), so every user falls back to this
 * placeholder. Size, shape and colours are supplied by the caller via
 * `className`; the base only centres the initial. Decorative (`aria-hidden`) —
 * the adjacent @handle is the accessible identity.
 */
export function UserAvatar({
  username,
  className,
}: {
  username: string;
  className?: string;
}) {
  const initial = username.trim().slice(0, 1).toUpperCase() || "?";
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex items-center justify-center font-semibold",
        className,
      )}
    >
      {initial}
    </span>
  );
}
