"use client";

import { useState } from "react";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import type { Item } from "@/src/shared/types/pack";

interface BlindRankBoardProps {
  optionIds: string[];
  itemsById: Map<string, Item>;
  disabled: boolean;
  onSubmit: (ranking: string[]) => void;
}

/**
 * The click-to-place-next blind ranking interaction — extracted from
 * GuessWhoRoundBoard's own `actionKind: "rank"` arm (Task 12) so Shared-grid
 * (whose entire round IS this interaction, not just one arm of it) reuses the
 * identical component rather than a second copy. Mirrors RankPlayScreen's
 * solo click-to-place flow exactly, generalized to report a `string[]`
 * instead of writing solo play's own placements state.
 */
export function BlindRankBoard({
  optionIds,
  itemsById,
  disabled,
  onSubmit,
}: BlindRankBoardProps) {
  const [rankSoFar, setRankSoFar] = useState<string[]>([]);

  function selectNext(optionId: string) {
    if (disabled || rankSoFar.includes(optionId)) return;
    const next = [...rankSoFar, optionId];
    setRankSoFar(next);
    if (next.length === optionIds.length) onSubmit(next);
  }

  return (
    <div className="flex flex-col gap-2">
      {optionIds.map((optionId) => {
        const item = itemsById.get(optionId);
        const placedAt = rankSoFar.indexOf(optionId);
        const placed = placedAt !== -1;
        return (
          <button
            key={optionId}
            type="button"
            disabled={disabled || placed}
            onClick={() => selectNext(optionId)}
            className={cn(
              "flex items-center gap-3 rounded-tile border-[1.5px] p-[14px] text-start transition-colors",
              placed
                ? "border-border opacity-60"
                : "border-dashed border-white/[0.14] hover:border-acc/40",
            )}
          >
            <span
              aria-hidden
              className="flex h-8 w-8 flex-none items-center justify-center rounded-chip bg-white/[0.06] text-[12px] font-semibold"
            >
              {placed ? placedAt + 1 : ""}
            </span>
            <Text className="flex-1 text-sm font-semibold">
              {item?.title ?? optionId}
            </Text>
          </button>
        );
      })}
    </div>
  );
}
