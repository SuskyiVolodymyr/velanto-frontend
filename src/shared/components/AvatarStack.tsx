import { cn } from "@/src/shared/lib/cn";
import { AVATAR_SIZE_CLASS, UserAvatar, type AvatarSize } from "./UserAvatar";

export interface AvatarStackUser {
  username: string;
  avatarKey?: string | null;
}

export interface AvatarStackProps {
  users: AvatarStackUser[];
  /** Max avatars to show before collapsing the rest into a `+N` chip. Omit to
   * show every user. */
  max?: number;
  /** Avatar diameter; defaults to the compact `sm` (26px) used in the mocks. */
  size?: AvatarSize;
  /** Separator ring colour — set it to match the surface the stack sits on.
   * Defaults to the card background. */
  ringClassName?: string;
  /** Accessible name for the group (e.g. "6 in the room"). When set, the stack
   * is announced as a single image; otherwise it is decorative. */
  label?: string;
  className?: string;
}

// Overlap tightens with the tile: the mocks use -8px at 26px and -6px at 20px.
const OVERLAP_CLASS: Record<AvatarSize, string> = {
  xs: "-ml-1.5",
  sm: "-ml-2",
  md: "-ml-2",
  lg: "-ml-3",
};

/**
 * A row of overlapping user avatars with a ring separating each from the one
 * behind it, collapsing any users past `max` into a dimmer `+N` chip. Used
 * wherever a set of participants needs to read at a glance (room presence, a
 * pack's players). Each avatar is decorative; give the group a `label` for the
 * accessible summary.
 */
export function AvatarStack({
  users,
  max,
  size = "sm",
  ringClassName = "border-surface-card",
  label,
  className,
}: AvatarStackProps) {
  const shown = max != null ? users.slice(0, max) : users;
  const overflow = users.length - shown.length;
  const overlap = OVERLAP_CLASS[size];

  return (
    <div
      className={cn("flex", className)}
      {...(label ? { role: "img", "aria-label": label } : {})}
    >
      {shown.map((user, i) => (
        <UserAvatar
          key={`${user.username}-${i}`}
          username={user.username}
          avatarKey={user.avatarKey}
          size={size}
          className={cn(
            "border-2 bg-surface-raised text-foreground-secondary",
            ringClassName,
            i > 0 && overlap,
          )}
        />
      ))}
      {overflow > 0 && (
        <span
          aria-hidden
          className={cn(
            "inline-flex flex-none items-center justify-center rounded-full border-2 bg-surface-raised font-bold text-foreground-secondary",
            AVATAR_SIZE_CLASS[size],
            ringClassName,
            overlap,
          )}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
