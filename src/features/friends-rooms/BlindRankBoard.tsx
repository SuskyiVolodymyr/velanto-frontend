"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { YouTubeCard } from "@/src/shared/components/YouTubeCard";
import { ImageCard } from "@/src/shared/components/ImageCard";
import {
  extractYouTubeId,
  extractYouTubeStart,
} from "@/src/shared/lib/youtube";
import { mediaUrl } from "@/src/shared/lib/media-url";
import { cn } from "@/src/shared/lib/cn";
import type { Item } from "@/src/shared/types/pack";

interface BlindRankBoardProps {
  /** The round's drawn options, in the order they are revealed one by one. */
  optionIds: string[];
  itemsById: Map<string, Item>;
  disabled: boolean;
  /** The finished ranking, in SLOT order — index 0 is rank #1. */
  onSubmit: (ranking: string[]) => void;
}

/**
 * The blind ranking interaction, shared by Guess-who's `actionKind: "rank"` arm
 * and the whole of Shared-grid (whose round IS this interaction). Mirrors the
 * solo rank_blind flow in RankPlayScreen: the item you are placing NOW, with
 * its media, beside the numbered slots you drop it into.
 *
 * It used to render every option as a row and take them in CLICK order. That is
 * not a blind ranking — the format's premise is committing an item to a
 * position without knowing what is still to come, and showing the whole draw up
 * front reduced it to an ordinary sort. It also showed no media at all, so a
 * pack of music videos was a list of names.
 *
 * The media sits in its own panel rather than inside a slot, which keeps every
 * slot a real `<button>`: a video's own play control inside a button would be a
 * button nested in a button (invalid HTML, breaks hydration) — the trade
 * RoundSideTile has to make and this layout avoids entirely.
 */
export function BlindRankBoard({
  optionIds,
  itemsById,
  disabled,
  onSubmit,
}: BlindRankBoardProps) {
  const t = useTranslations("room");
  // Indexed by RANK, not by click: `placements[0]` is rank #1. `null` is an
  // empty slot.
  const [placements, setPlacements] = useState<(string | null)[]>(() =>
    optionIds.map(() => null),
  );

  const placed = new Set(placements.filter((id): id is string => id !== null));
  const currentId = optionIds.find((id) => !placed.has(id)) ?? null;
  const currentItem = currentId ? itemsById.get(currentId) : undefined;
  const remaining = optionIds.filter(
    (id) => !placed.has(id) && id !== currentId,
  ).length;

  function place(slotIndex: number) {
    if (disabled || currentId === null || placements[slotIndex] !== null)
      return;
    const next = [...placements];
    next[slotIndex] = currentId;
    setPlacements(next);
    if (next.every((id) => id !== null)) onSubmit(next as string[]);
  }

  const videoId =
    currentItem?.type === "youtube"
      ? extractYouTubeId(currentItem.value)
      : null;

  return (
    // The mock's own rank breakpoint (900px), matching RankPlayScreen — below
    // it the current item stacks above its slots rather than shrinking beside
    // them.
    <div className="grid items-start gap-4 min-[901px]:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col gap-3 rounded-[20px] border border-acc/30 bg-surface-card p-[18px]">
        <Text
          variant="tertiary"
          className="text-[11px] font-bold tracking-[0.12em] text-acc-hover uppercase"
        >
          {t("board.rankNowPlacing")}
        </Text>

        {/* ImageCard/YouTubeCard carry their own 16:9 box; only a text item
            needs one built here, so the panel keeps its height either way. */}
        {videoId ? (
          <YouTubeCard
            videoId={videoId}
            startSeconds={extractYouTubeStart(currentItem!.value)}
            className="rounded-[13px]"
          />
        ) : currentItem?.type === "image" ? (
          <ImageCard
            src={mediaUrl(currentItem.value)}
            alt={currentItem.title}
            className="rounded-[13px]"
          />
        ) : (
          <div className="aspect-video rounded-[13px] border border-border bg-background" />
        )}

        <Text className="text-[18px] font-bold tracking-[-0.015em] text-pretty">
          {currentItem?.title ?? ""}
        </Text>
        {/* How much is still coming — the only thing you know about the rest of
            the draw, and what makes a position a real gamble. */}
        <Text
          variant="tertiary"
          className="mt-auto border-t border-border pt-[11px] text-[12px]"
        >
          {t("board.rankHiddenAfter", { count: remaining })}
        </Text>
      </div>

      <div className="flex flex-col gap-2">
        {placements.map((filledId, slotIndex) => {
          const filledItem = filledId ? itemsById.get(filledId) : undefined;
          return (
            <button
              key={slotIndex}
              type="button"
              disabled={disabled || filledId !== null}
              onClick={() => place(slotIndex)}
              aria-label={
                filledId
                  ? t("board.rankSlotFilled", {
                      rank: slotIndex + 1,
                      title: filledItem?.title ?? filledId,
                    })
                  : t("board.rankSlotEmpty", { rank: slotIndex + 1 })
              }
              className={cn(
                "flex w-full items-center gap-3 rounded-tile border p-[11px_13px] text-start transition-colors",
                filledId
                  ? "border-border bg-surface-card"
                  : "border-dashed border-acc/40 enabled:hover:bg-acc/[0.08]",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] font-mono text-[13px] font-bold tabular-nums",
                  filledId
                    ? "bg-white/[0.06] text-foreground/55"
                    : "bg-acc/[0.12] text-acc-hover",
                )}
              >
                #{slotIndex + 1}
              </span>
              {filledId ? (
                <Text className="line-clamp-1 flex-1 text-sm font-[650]">
                  {filledItem?.title ?? filledId}
                </Text>
              ) : (
                <Text
                  variant="tertiary"
                  className="line-clamp-1 flex-1 text-[14px] font-semibold"
                >
                  {t("board.rankPlaceHere", { name: currentItem?.title ?? "" })}
                </Text>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
