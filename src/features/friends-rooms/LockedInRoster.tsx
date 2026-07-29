"use client";

import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { cn } from "@/src/shared/lib/cn";
import type { RoomPlayerState } from "./room-types";

interface LockedInRosterProps {
  players: RoomPlayerState[];
  /** userIds who have submitted a BLIND selection/ranking this round — never
   * what they submitted. */
  lockedIn: string[];
}

/**
 * "Who's locked in" for a blind round (Guess-who, Shared-grid) — every seated
 * player as a small avatar chip, checked once they've locked in, dimmed while
 * still deciding. Deliberately carries no prop that could leak a selection:
 * this component physically cannot render a pick, only who has made one.
 */
export function LockedInRoster({ players, lockedIn }: LockedInRosterProps) {
  const t = useTranslations("room");
  const lockedSet = new Set(lockedIn);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {players.map((player) => {
          const locked = lockedSet.has(player.userId);
          return (
            <div
              key={player.userId}
              aria-label={
                locked
                  ? t("lockedIn.playerLocked", { name: player.username })
                  : t("lockedIn.playerWaiting", { name: player.username })
              }
              className={cn(
                "flex items-center gap-1.5 rounded-pill border px-2 py-1",
                locked
                  ? "border-live/40 bg-live/10"
                  : "border-border bg-white/[0.02] opacity-70",
              )}
            >
              <UserAvatar
                username={player.username}
                avatarKey={player.avatarKey}
                size="xs"
              />
              <Text className="text-[11px] font-medium">{player.username}</Text>
              {locked && <Check size={12} aria-hidden className="text-live" />}
            </div>
          );
        })}
      </div>
      <Text variant="secondary" aria-live="polite" className="text-xs">
        {t("lockedIn.count", { count: lockedIn.length, total: players.length })}
      </Text>
    </div>
  );
}
