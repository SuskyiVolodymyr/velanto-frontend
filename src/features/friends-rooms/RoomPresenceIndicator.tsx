"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AvatarStack } from "@/src/shared/components/AvatarStack";
import { useAuth } from "@/src/shared/lib/auth-context";
import { useFriendsRoomsPresence } from "./friends-rooms-presence-context";
import type { MyRoomSummary } from "./room-types";

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
 *
 * While rooms are dormant (`ROOMS_DORMANT` in room-types) the presence provider
 * skips its `/mine` poll, so `rooms` is always empty and this hides through the
 * no-rooms guard below — it needs no room-specific gate of its own.
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
    <div className="fixed end-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom)+0.75rem)] z-30 flex flex-col items-end gap-2">
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

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t("presence.returnTo", { title: room.packTitle })}
      className="group flex max-w-[19rem] items-center gap-3 rounded-2xl border border-acc/40 bg-surface py-2.5 ps-3 pe-4 shadow-[0_10px_30px_rgba(0,0,0,0.4)] ring-1 ring-acc/10 transition-colors hover:border-acc focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc"
    >
      {/* Capacity is not on MyRoomSummary (see room-types.ts) and varies per
          mode (4 seats for Claim, up to 12 for Voting), so this renders every
          member as a real avatar and lets AvatarStack's own `+N` overflow
          chip collapse the rest — no empty-seat placeholders, since there's
          no single capacity left to fill them up to. */}
      <div className="flex flex-none">
        <AvatarStack
          users={room.players.map((player) => ({
            username: player.username,
            avatarKey: player.avatarKey,
          }))}
          size="md"
          ringClassName="border-surface"
          max={6}
        />
      </div>
      {/* flex-1 + min-w-0 is what lets the title truncate: without them this
          column is sized by its content, so a long pack title pushes straight
          out of the chip instead of ellipsing inside it. */}
      <span className="flex min-w-0 flex-1 flex-col items-start">
        <span className="flex max-w-full items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-acc">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-acc/70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-acc" />
          </span>
          {t("presence.playerCount", { count: room.players.length })}
        </span>
        {/* Truncates to whatever the chip has left after the avatars, rather
            than to a fixed width that could be wider than that. The full title
            is still on the button's aria-label. */}
        <span className="w-full truncate text-[15px] font-semibold text-foreground">
          {room.packTitle}
        </span>
      </span>
    </button>
  );
}
