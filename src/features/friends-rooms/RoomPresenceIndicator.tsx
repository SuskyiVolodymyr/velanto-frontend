"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { useAuth } from "@/src/shared/lib/auth-context";
import { useFriendsRoomsPresence } from "./friends-rooms-presence-context";
import type { MyRoomSummary } from "./room-types";

/** How many avatars we render before collapsing the rest into "+N". */
const MAX_AVATARS = 4;

/** Pull the room id out of a `/rooms/<id>` path, else null. */
function currentRoomId(pathname: string | null): string | null {
  if (!pathname) return null;
  const match = pathname.match(/^\/rooms\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * A persistent, floating "you're in a room" affordance. For every friends room
 * the signed-in user still holds a seat in, it renders a compact button (up to
 * four overlapping player avatars) that routes back into the room — so leaving
 * the room screen to browse doesn't strand you.
 *
 * Fixed to the bottom-right. It sits ABOVE the mobile bottom nav (which is
 * `fixed bottom-0 z-40`, ~4.5rem tall, `md:hidden`) by offsetting its own bottom
 * past the nav's height plus the safe-area inset on phones, and dropping to a
 * plain `bottom-6` from `md` up where the nav is gone. Its own z-index sits
 * below the nav's so the nav always wins if they ever meet.
 *
 * Renders nothing when signed out, when there are no rooms, or — to avoid
 * redundancy — for the room whose screen you are currently on.
 */
export function RoomPresenceIndicator() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { rooms } = useFriendsRoomsPresence();

  if (!user) return null;

  const onRoomId = currentRoomId(pathname);
  const visible = rooms.filter((room) => room.id !== onRoomId);
  if (visible.length === 0) return null;

  return (
    <div className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom)+0.75rem)] z-30 flex flex-col items-end gap-2 md:bottom-6">
      {visible.map((room) => (
        <RoomChip
          key={room.id}
          room={room}
          onClick={() => router.push(`/rooms/${room.id}`)}
        />
      ))}
    </div>
  );
}

function RoomChip({
  room,
  onClick,
}: {
  room: MyRoomSummary;
  onClick: () => void;
}) {
  const t = useTranslations("room");
  const shown = room.players.slice(0, MAX_AVATARS);
  const extra = room.players.length - shown.length;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t("presence.returnTo", { title: room.packTitle })}
      className="flex max-w-[15rem] items-center gap-2.5 rounded-full border border-border bg-surface py-1.5 pl-2 pr-3.5 shadow-[0_6px_20px_rgba(0,0,0,0.28)] transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc"
    >
      <span className="flex flex-none -space-x-2">
        {shown.map((player) => (
          <UserAvatar
            key={player.userId}
            username={player.username}
            avatarKey={player.avatarKey}
            className="h-7 w-7 rounded-full border-2 border-surface bg-background text-xs text-foreground-secondary"
          />
        ))}
        {extra > 0 && (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-background text-[11px] font-semibold text-foreground-secondary">
            +{extra}
          </span>
        )}
      </span>
      <span className="min-w-0 truncate text-sm font-medium text-foreground">
        {room.packTitle}
      </span>
    </button>
  );
}
