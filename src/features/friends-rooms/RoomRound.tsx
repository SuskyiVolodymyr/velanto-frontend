"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { Pack } from "@/src/shared/types/pack";
import type { ClaimRejection, RoomPlayerState, RoomState } from "./room-types";
import { RoomItemCard } from "./RoomItemCard";

interface RoomRoundProps {
  state: RoomState;
  currentUserId: string | null;
  lastRejection: ClaimRejection | null;
  onClaim: (itemId: string) => void;
  /** save_one or sacrifice_one — picks the "Save"/"Sacrifice" verb pair.
   * Defaults to sacrifice_one, this board's original (and only) framing,
   * for any caller that doesn't yet know the pack's format. */
  packFormat?: Extract<Pack["format"], "save_one" | "sacrifice_one">;
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
  packFormat = "sacrifice_one",
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

  return (
    <div className="flex flex-col gap-6">
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
              format={packFormat}
            />
          );
        })}
      </div>

      {/* Plain <p>, not <Text variant="secondary">, deliberately: Text's variant
          system sets a color class of equal CSS specificity to any color
          class passed via className, and per Text.tsx's own documented
          gotcha the variant's class wins regardless of source order — a
          variant="secondary" className="text-score" pairing here would have
          silently rendered muted grey instead of the amber warning tone. */}
      {lastRejection?.reason === "too_fast" && (
        <p role="status" className="text-xs text-score tracking-[-0.01em]">
          {t("round.tooFastNote")}
        </p>
      )}
    </div>
  );
}
