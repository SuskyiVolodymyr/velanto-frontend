import { cn } from "@/src/shared/lib/cn";
import { mediaUrl } from "@/src/shared/lib/media-url";
import { AvatarImage } from "./AvatarImage";

/**
 * User avatar. Renders the user's uploaded photo (resolved from its storage
 * `avatarKey` via {@link mediaUrl}) when present, otherwise a tile with the
 * first letter of the username. Size, shape, border and colours are supplied by
 * the caller via `className`; the base only centres the initial / covers the
 * image.
 *
 * Decorative by design (`aria-hidden`, empty `alt`): every call site renders it
 * next to the user's @handle, which is the accessible identity — announcing the
 * name again here would double it up for screen-reader users.
 */
export function UserAvatar({
  username,
  avatarKey,
  className,
}: {
  username: string;
  /** Storage key of the avatar image; null/absent falls back to the initial. */
  avatarKey?: string | null;
  className?: string;
}) {
  const initial = username.trim().slice(0, 1).toUpperCase() || "?";
  if (avatarKey) {
    // `key` on the resolved URL so a changed avatar resets AvatarImage's
    // load-error state (a fresh key gets a fresh attempt).
    return (
      <AvatarImage
        key={avatarKey}
        src={mediaUrl(avatarKey)}
        initial={initial}
        className={className}
      />
    );
  }

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
