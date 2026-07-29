"use client";

import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import type { Pack } from "@/src/shared/types/pack";
import { RoomItemCard } from "./RoomItemCard";
import { TurnIndicator } from "./TurnIndicator";
import type { RoomState } from "./room-types";

interface TurnBasedCutBoardProps {
  state: RoomState;
  currentUserId: string | null;
  onCut: (itemId: string) => void;
  /** save_one or sacrifice_one — this mode is only ever offered on those two
   * formats (ROOM_MODE_BOUNDS), so RoomItemCard's existing save/sacrifice
   * verb pair (Task 9) covers it; no separate "cut" verb needed. */
  packFormat?: Extract<Pack["format"], "save_one" | "sacrifice_one">;
}

/**
 * Turn-based cut's board (design brief §4.3(c)): the full original board, with
 * every already-cut item visibly dropped to RoomItemCard's existing
 * "sacrificed" status (labeled with WHO cut it, from `round.cuts`) and every
 * remaining item a live cut button ONLY while it's the viewer's own turn.
 */
export function TurnBasedCutBoard({
  state,
  currentUserId,
  onCut,
  packFormat = "sacrifice_one",
}: TurnBasedCutBoardProps) {
  const t = useTranslations("room");
  const round = state.round;
  if (!round || !round.remainingItemIds) return null;

  const remaining = new Set(round.remainingItemIds);
  const cutterByItem = new Map(
    (round.cuts ?? []).map((cut) => [cut.itemId, cut.userId]),
  );
  const playerByUserId = new Map(state.players.map((p) => [p.userId, p]));
  const isMyTurn = round.turnUserId === currentUserId;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Text variant="tertiary" className="text-xs uppercase tracking-wide">
          {t("round.heading", {
            index: round.index + 1,
            total: state.totalRounds,
          })}
        </Text>
        <Text as="h2" variant="title" className="text-2xl">
          {round.name || t("turnBasedCut.instruction")}
        </Text>
      </header>

      <TurnIndicator
        players={state.players}
        turnUserId={round.turnUserId ?? null}
        currentUserId={currentUserId}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {round.items.map((item, index) => {
          const isRemaining = remaining.has(item.id);
          const cutterUserId = cutterByItem.get(item.id);
          const cutter = cutterUserId ? playerByUserId.get(cutterUserId) : null;
          return (
            <RoomItemCard
              key={item.id}
              item={item}
              index={index}
              format={packFormat}
              status={isRemaining ? "free" : "sacrificed"}
              claimant={cutter}
              onClaim={isRemaining && isMyTurn ? () => onCut(item.id) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
