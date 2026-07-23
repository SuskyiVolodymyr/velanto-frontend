"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import type { ClaimRejection, RoomPlayerState, RoomState } from "./room-types";
import { RoomItemCard } from "./RoomItemCard";

interface RoomRoundProps {
  state: RoomState;
  currentUserId: string | null;
  lastRejection: ClaimRejection | null;
  onClaim: (itemId: string) => void;
}

/**
 * The claim board. Each of the `players + 1` items is a card; a free one is a
 * claim button, a taken one carries the claimant's avatar in red and is inert.
 * A player may move their claim while anyone is still deciding, so clicking a
 * different free item just re-claims — the server echoes it back.
 */
export function RoomRound({
  state,
  currentUserId,
  lastRejection,
  onClaim,
}: RoomRoundProps) {
  const t = useTranslations("room");
  const round = state.round;

  // itemId → the player sacrificing it, inverted from { userId: itemId }.
  const claimantByItem = useMemo(() => {
    const map = new Map<string, RoomPlayerState>();
    if (!round) return map;
    const byId = new Map(state.players.map((p) => [p.userId, p]));
    for (const [userId, itemId] of Object.entries(round.claims)) {
      const player = byId.get(userId);
      if (player) map.set(itemId, player);
    }
    return map;
  }, [round, state.players]);

  if (!round) return null;

  const chosen = Object.keys(round.claims).length;
  const total = state.players.filter((p) => p.connected).length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Text variant="tertiary" className="text-xs uppercase tracking-wide">
          {t("round.heading", {
            index: round.index + 1,
            total: state.totalRounds,
          })}
        </Text>
        <Text as="h1" variant="title" className="text-2xl">
          {t("round.instruction")}
        </Text>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {round.items.map((item, index) => {
          const claimant = claimantByItem.get(item.id) ?? null;
          const isOwn = claimant?.userId === currentUserId;
          const free = !claimant;
          return (
            <RoomItemCard
              key={item.id}
              item={item}
              index={index}
              status={free ? "free" : "claimed"}
              claimant={claimant}
              isOwn={isOwn}
              flash={lastRejection?.itemId === item.id}
              onClaim={free ? () => onClaim(item.id) : undefined}
            />
          );
        })}
      </div>

      <Text
        variant="secondary"
        aria-live="polite"
        className={cn("text-sm", chosen === total && "text-success")}
      >
        {t("round.chosen", { count: chosen, total })}
      </Text>
    </div>
  );
}
