import { cn } from "@/src/shared/lib/cn";
import { mediaUrl } from "@/src/shared/lib/media-url";
import { AvatarImage } from "./AvatarImage";

/** Canonical UI-kit v1 avatar sizes (diameter / initial font): xs 20, sm 26,
 * md 34, lg 48. Opt in via the `size` prop; callers can still hand-size via
 * `className` when they need a one-off dimension. */
export type AvatarSize = "xs" | "sm" | "md" | "lg";

export const AVATAR_SIZE_CLASS: Record<AvatarSize, string> = {
  xs: "h-5 w-5 text-[9px]",
  sm: "h-[26px] w-[26px] text-[10px]",
  md: "h-[34px] w-[34px] text-xs",
  lg: "h-12 w-12 text-base",
};

/**
 * User avatar. Renders the user's uploaded photo (resolved from its storage
 * `avatarKey` via {@link mediaUrl}) when present, otherwise a tile with the
 * first letter of the username. Pass `size` for a canonical circular tile (it
 * owns the dimensions), or omit `size` and size/shape it yourself via
 * `className`. Don't combine `size` with a dimensional `className`: `cn()` here
 * is a plain join, so conflicting `h/w/rounded` utilities resolve by stylesheet
 * order, not by `className` winning. `className` is still the place for
 * non-dimensional extras (a background tone, a ring).
 *
 * Decorative by design (`aria-hidden`, empty `alt`): every call site renders it
 * next to the user's @handle, which is the accessible identity — announcing the
 * name again here would double it up for screen-reader users.
 */
export function UserAvatar({
  username,
  avatarKey,
  size,
  className,
}: {
  username: string;
  /** Storage key of the avatar image; null/absent falls back to the initial. */
  avatarKey?: string | null;
  /** Canonical circular size; omit to size via `className`. */
  size?: AvatarSize;
  className?: string;
}) {
  const initial = username.trim().slice(0, 1).toUpperCase() || "?";
  // `size` owns the circle + fixed flex basis so the tile never deforms or
  // shrinks in a flex row; a `className` adds non-dimensional extras only (see
  // the doc comment — it must not set a conflicting h/w under plain-join cn).
  const shape = size
    ? cn("flex-none rounded-full", AVATAR_SIZE_CLASS[size], className)
    : className;

  if (avatarKey) {
    // `key` on the resolved URL so a changed avatar resets AvatarImage's
    // load-error state (a fresh key gets a fresh attempt).
    return (
      <AvatarImage
        key={avatarKey}
        src={mediaUrl(avatarKey)}
        initial={initial}
        className={shape}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex items-center justify-center font-bold",
        shape,
      )}
    >
      {initial}
    </span>
  );
}
