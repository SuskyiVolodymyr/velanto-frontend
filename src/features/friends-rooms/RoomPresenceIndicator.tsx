"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { useAuth } from "@/src/shared/lib/auth-context";
import { useFriendsRoomsPresence } from "./friends-rooms-presence-context";
import { MAX_PLAYERS, type MyRoomSummary } from "./room-types";

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
  // The format caps a room at MAX_PLAYERS, so filled seats never overflow —
  // render every member as an avatar, then dashed empty circles for the seats
  // still open, so the chip reads as "N of MAX are here" at a glance.
  const emptySeats = Math.max(0, MAX_PLAYERS - room.players.length);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t("presence.returnTo", { title: room.packTitle })}
      className="group flex max-w-[19rem] items-center gap-3 rounded-2xl border border-acc/40 bg-surface py-2.5 pl-3 pr-4 shadow-[0_10px_30px_rgba(0,0,0,0.4)] ring-1 ring-acc/10 transition-colors hover:border-acc focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc"
    >
      <span className="flex flex-none -space-x-2.5">
        {room.players.map((player) => (
          <UserAvatar
            key={player.userId}
            username={player.username}
            avatarKey={player.avatarKey}
            className="h-9 w-9 rounded-full border-2 border-surface bg-background text-sm text-foreground-secondary"
          />
        ))}
        {Array.from({ length: emptySeats }, (_, i) => (
          <span
            key={`empty-${i}`}
            aria-hidden
            className="h-9 w-9 rounded-full border-2 border-dashed border-border-strong bg-surface"
          />
        ))}
      </span>
      <span className="flex min-w-0 flex-col items-start">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-acc">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-acc/70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-acc" />
          </span>
          {t("presence.label", {
            count: room.players.length,
            max: MAX_PLAYERS,
          })}
        </span>
        <span className="min-w-0 max-w-[13rem] truncate text-[15px] font-semibold text-foreground">
          {room.packTitle}
        </span>
      </span>
    </button>
  );
}
