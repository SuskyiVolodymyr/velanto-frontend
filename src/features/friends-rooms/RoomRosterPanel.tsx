"use client";

import { useTranslations } from "next-intl";
import { Check, UserPlus, X } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { Username } from "@/src/shared/components/Username";
import { cn } from "@/src/shared/lib/cn";
import type { RoomPlayerState } from "./room-types";

interface RoomRosterPanelProps {
  players: RoomPlayerState[];
  currentUserId: string | null;
  hostId: string;
  /** The chosen mode's seat cap, for the "x/y" chip and the capacity note. */
  maxPlayers: number;
  /** The chosen mode's floor, so a too-small room says what it needs. */
  minPlayers: number;
  /** Whether the viewer may kick — host only. */
  canKick: boolean;
  onKick: (player: RoomPlayerState) => void;
  /** Copies the invite link. Absent once the room has no code left to share. */
  onInvite?: () => void;
}

/**
 * The lobby's Players card (Room Lobby.dc.html): who is seated, how each of
 * them is doing, and how much room is left.
 *
 * No empty-seat placeholders — the mock replaced them with the capacity note,
 * which says the same thing without implying the room is waiting for a
 * specific number of people.
 */
export function RoomRosterPanel({
  players,
  currentUserId,
  hostId,
  maxPlayers,
  minPlayers,
  canKick,
  onKick,
  onInvite,
}: RoomRosterPanelProps) {
  const t = useTranslations("room");
  const free = Math.max(0, maxPlayers - players.length);
  const short = players.length < minPlayers;

  return (
    <section
      aria-label={t("lobby.roster")}
      className="flex flex-col gap-[13px] rounded-card border border-border bg-surface-card p-[18px]"
    >
      <div className="flex items-center gap-[9px]">
        <Text as="h2" className="text-[15px] font-bold">
          {t("lobby.roster")}
        </Text>
        <span className="rounded-full bg-white/[0.07] px-[9px] py-[3px] text-[11.5px] font-bold text-foreground-secondary">
          {t("lobby.seatCount", { count: players.length, max: maxPlayers })}
        </span>
        <Text
          className={cn(
            "ms-auto text-[11.5px] font-semibold",
            short ? "text-score" : "text-foreground-tertiary",
          )}
        >
          {short
            ? t("lobby.capacityNeeds", { min: minPlayers })
            : free === 0
              ? t("lobby.capacityFull")
              : t("lobby.capacityRoomFor", { count: free })}
        </Text>
      </div>

      <ul className="flex flex-col gap-2">
        {players.map((player) => {
          const isYou = player.userId === currentUserId;
          const isHost = player.userId === hostId;
          return (
            <li
              key={player.userId}
              className={cn(
                "flex items-center gap-2.5 rounded-[13px] border p-[10px_11px]",
                player.ready
                  ? "border-live/25 bg-live/[0.06]"
                  : isYou
                    ? "border-acc/[0.28] bg-acc/[0.05]"
                    : "border-border bg-background",
              )}
            >
              <div className="relative flex-none">
                <UserAvatar
                  username={player.username}
                  avatarKey={player.avatarKey}
                  className="h-9 w-9 rounded-full bg-surface-raised text-[12.5px] font-bold text-foreground"
                />
                <span
                  aria-hidden
                  className={cn(
                    "absolute -bottom-0.5 -end-0.5 h-3 w-3 rounded-full border-2 border-surface-card",
                    player.connected ? "bg-live" : "bg-foreground-tertiary",
                  )}
                />
              </div>

              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="flex min-w-0 items-center gap-[7px]">
                  <Username
                    username={player.username}
                    className="truncate text-[13.5px] font-semibold"
                  />
                  {isYou && (
                    <span className="flex-none rounded-md bg-white/[0.08] px-[7px] py-0.5 text-[10px] font-bold tracking-[0.04em] text-foreground-secondary">
                      {t("lobby.you")}
                    </span>
                  )}
                  {isHost && (
                    <span className="flex-none rounded-md bg-acc/[0.16] px-[7px] py-0.5 text-[10px] font-bold tracking-[0.04em] text-acc-hover">
                      {t("lobby.host")}
                    </span>
                  )}
                  {/* A guest is a name someone typed into a box: no profile
                      behind it, and nothing stops a second person typing the
                      same one. The host is entitled to see which is which. */}
                  {player.guest && (
                    <span className="flex-none rounded-md bg-white/[0.08] px-[7px] py-0.5 text-[10px] font-bold tracking-[0.04em] text-foreground-tertiary">
                      {t("lobby.guest")}
                    </span>
                  )}
                </div>
                <Text
                  className={cn(
                    "text-[11.5px] font-semibold",
                    player.ready ? "text-live" : "text-foreground-tertiary",
                  )}
                >
                  {!player.connected
                    ? t("lobby.away")
                    : player.ready
                      ? t("lobby.ready")
                      : isYou
                        ? t("lobby.tapReadyWhenYouAre")
                        : t("lobby.stillDeciding")}
                </Text>
              </div>

              <div className="ms-auto flex flex-none items-center gap-1">
                {player.ready && (
                  <span
                    aria-hidden
                    className="grid h-[22px] w-[22px] place-items-center rounded-full bg-live/[0.18] text-live"
                  >
                    <Check size={12} strokeWidth={3.2} />
                  </span>
                )}
                {canKick && !isYou && (
                  <button
                    type="button"
                    onClick={() => onKick(player)}
                    aria-label={t("kick.action", { name: player.username })}
                    className="rounded-full p-1.5 text-foreground-tertiary transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc"
                  >
                    <X size={15} aria-hidden />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {onInvite && (
        <button
          type="button"
          onClick={onInvite}
          className="flex h-[42px] items-center justify-center gap-2 rounded-control border border-dashed border-border-strong text-[13px] font-semibold text-foreground-secondary transition-colors hover:border-white/30 hover:bg-white/[0.04] hover:text-foreground"
        >
          <UserPlus size={16} aria-hidden />
          {t("lobby.inviteSomeone")}
        </button>
      )}
    </section>
  );
}
