import { cn } from "@/src/shared/lib/cn";
import { mediaUrl } from "@/src/shared/lib/media-url";

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
  if (avatarKey) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- CDN-resolved avatar; Next <Image> needs remote-loader config and adds no value for this small, already-processed thumbnail
      <img
        src={mediaUrl(avatarKey)}
        alt=""
        aria-hidden
        className={cn("object-cover", className)}
      />
    );
  }

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
