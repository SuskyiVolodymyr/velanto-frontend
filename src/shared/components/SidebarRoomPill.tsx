"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/src/shared/lib/auth-context";
import { useFriendsRoomsPresence } from "@/src/features/friends-rooms/friends-rooms-presence-context";
import { MAX_PLAYERS } from "@/src/features/friends-rooms/room-types";

/**
 * "You're in a room" pill for the sidebar footer. Shows the first room the
 * signed-in user still holds a seat in — live dot, pack title, lobby count, and
 * a rejoin affordance. Reuses the live presence context (no fabricated data);
 * renders nothing when signed out or seatless. The floating
 * {@link RoomPresenceIndicator} is constrained to mobile so the two never
 * double up on desktop.
 */
export function SidebarRoomPill({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("shell");
  const { user } = useAuth();
  const { rooms } = useFriendsRoomsPresence();

  if (!user || rooms.length === 0) return null;
  const room = rooms[0];

  return (
    <Link
      href={`/rooms/${room.id}`}
      onClick={onNavigate}
      className="flex flex-col gap-1 rounded-[14px] border border-live/[0.28] bg-live/[0.07] px-3 py-2.5 transition-colors hover:border-live/50"
    >
      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-live">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live/70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-live" />
        </span>
        {t("room.inARoom")}
      </span>
      <span className="truncate text-[13.5px] font-semibold text-foreground">
        {room.packTitle}
      </span>
      <span className="flex items-center justify-between text-[12px] text-foreground-secondary">
        <span>
          {t("room.lobby", { count: room.players.length, max: MAX_PLAYERS })}
        </span>
        <span className="font-semibold text-live">{t("room.rejoin")}</span>
      </span>
    </Link>
  );
}
