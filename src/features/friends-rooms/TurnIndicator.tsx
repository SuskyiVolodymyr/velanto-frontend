"use client";

import { useTranslations } from "next-intl";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import type { RoomPlayerState } from "./room-types";

interface TurnIndicatorProps {
  players: RoomPlayerState[];
  /** Whose turn it is right now, or null once the round has resolved (no more
   * turns to take). */
  turnUserId: string | null;
  currentUserId: string | null;
}

/**
 * Shared whose-turn banner (design brief §3.4) for the two turn-based modes,
 * Turn-based cut and Relay. A ring around the current turn-holder's avatar
 * (the "turn-circle visualization" the task brief calls out) plus a text CTA
 * that flips to a stronger, accented state when it is the VIEWER'S OWN turn.
 */
export function TurnIndicator({
  players,
  turnUserId,
  currentUserId,
}: TurnIndicatorProps) {
  const t = useTranslations("room");
  if (!turnUserId) return null;
  const turnPlayer = players.find((p) => p.userId === turnUserId);
  if (!turnPlayer) return null;
  const isMine = turnUserId === currentUserId;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-3 rounded-tile border p-3",
        isMine ? "border-acc bg-acc/10" : "border-border bg-surface",
      )}
    >
      <span
        className={cn(
          "flex h-11 w-11 flex-none items-center justify-center rounded-full ring-2",
          isMine ? "ring-acc animate-livedot" : "ring-border-strong",
        )}
      >
        <UserAvatar
          username={turnPlayer.username}
          avatarKey={turnPlayer.avatarKey}
          size="sm"
        />
      </span>
      {/* Plain <p>, not <Text>, when isMine: Text always applies a variant
          color class of equal specificity to any color className passed
          alongside it, and per Text.tsx's own documented gotcha the variant
          wins regardless of source order — text-acc would have silently lost
          to the default "body" variant's text-foreground here. */}
      {isMine ? (
        <p className="text-sm font-semibold text-acc tracking-[-0.01em]">
          {t("turnIndicator.yourTurn")}
        </p>
      ) : (
        <Text className="text-sm font-semibold">
          {t("turnIndicator.waitingFor", { name: turnPlayer.username })}
        </Text>
      )}
    </div>
  );
}
