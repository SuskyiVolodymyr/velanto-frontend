"use client";

import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { YouTubeCard } from "@/src/shared/components/YouTubeCard";
import { ImageCard } from "@/src/shared/components/ImageCard";
import {
  extractYouTubeId,
  extractYouTubeStart,
} from "@/src/shared/lib/youtube";
import { mediaUrl } from "@/src/shared/lib/media-url";
import { cn } from "@/src/shared/lib/cn";
import type { RoomState } from "./room-types";

interface RelayInsertBoardProps {
  state: RoomState;
  currentUserId: string | null;
  onPlaceItem: (itemId: string, position: number) => void;
}

/**
 * Relay's board (Rank Modes.dc.html, relay arm): the item currently on the
 * table, and the shared ranking built so far with an insertion gap between
 * every pair — live only on the viewer's own turn.
 *
 * Nobody owns the result: the reveal order is fixed at round start and each
 * player only ever places the one item in front of them, so the ranking is
 * genuinely assembled by the room rather than aggregated from private ballots.
 * Whose turn it is comes from the chrome's call banner, so this no longer
 * carries a TurnIndicator of its own.
 */
export function RelayInsertBoard({
  state,
  currentUserId,
  onPlaceItem,
}: RelayInsertBoardProps) {
  const t = useTranslations("room");
  const round = state.round;
  if (!round || !round.relayPlaced || round.relayCurrentItemId === undefined) {
    return null;
  }

  const itemsById = new Map(round.items.map((item) => [item.id, item]));
  const playerById = new Map(state.players.map((p) => [p.userId, p]));
  const placed = round.relayPlaced;
  const currentItemId = round.relayCurrentItemId;
  const currentItem = currentItemId ? itemsById.get(currentItemId) : null;
  const isMyTurn = round.turnUserId === currentUserId;
  const filled = placed.filter((id) => id !== null).length;
  const remaining = round.items.length - filled - (currentItem ? 1 : 0);
  const currentVideoId =
    currentItem?.type === "youtube"
      ? extractYouTubeId(currentItem.value)
      : null;

  // Who placed which item. `relayPlacements` is in placement order, not slot
  // order, so it is indexed by item rather than by position.
  const placerByItem = new Map(
    (round.relayPlacements ?? []).map((p) => [p.itemId, p.userId]),
  );

  // A plain render-helper function, not a nested component definition —
  // deliberately lowercase and called directly so nothing gets remounted (and
  // loses state) on every parent re-render, which is what defining a component
  // inside another component's render body would otherwise cause.
  //
  // One row per SLOT, numbered #1..#N, exactly like BlindRankBoard's board:
  // filled slots show their item, free ones are targets. The list used to be
  // built by insertion, which offered only `placed.length + 1` positions — so
  // the first item of a round had exactly one place it could go, which is no
  // ranking decision at all.
  function renderSlot(position: number) {
    const filledId = placed[position];
    if (filledId) {
      const placer = placerByItem.get(filledId);
      const player = placer ? playerById.get(placer) : undefined;
      return (
        <div
          key={position}
          className="flex items-center gap-3 rounded-tile border border-border bg-background p-[11px_13px]"
        >
          <span className="grid h-[30px] w-[30px] flex-none place-items-center rounded-[9px] bg-white/[0.06] font-mono text-[13px] font-bold tabular-nums">
            #{position + 1}
          </span>
          <Text className="min-w-0 flex-1 truncate text-sm font-semibold">
            {itemsById.get(filledId)?.title ?? filledId}
          </Text>
          {player && (
            <span className="flex flex-none items-center gap-[7px]">
              <Text variant="tertiary" className="text-[11px]">
                {t("relay.placedBy")}
              </Text>
              <UserAvatar
                username={player.username}
                avatarKey={player.avatarKey}
                className="h-6 w-6 rounded-full bg-surface-raised text-[9.5px] font-bold text-foreground"
              />
            </span>
          )}
        </div>
      );
    }

    // A free slot someone else is deciding on: still drawn, so the board keeps
    // its full shape and everyone can see what is left to fill.
    if (!isMyTurn || !currentItemId) {
      return (
        <div
          key={position}
          className="flex items-center gap-3 rounded-tile border border-dashed border-border p-[11px_13px]"
        >
          <span className="grid h-[30px] w-[30px] flex-none place-items-center rounded-[9px] bg-white/[0.04] font-mono text-[13px] font-bold tabular-nums text-foreground-tertiary">
            #{position + 1}
          </span>
        </div>
      );
    }

    return (
      <button
        key={position}
        type="button"
        onClick={() => onPlaceItem(currentItemId, position)}
        // Named by its rank, so the N targets are distinguishable to
        // screen-reader and voice-control users ("click Place at rank 3").
        aria-label={t("relay.placeAtRank", { rank: position + 1 })}
        className="flex w-full items-center gap-3 rounded-tile border border-dashed border-acc/45 p-[11px_13px] text-start text-[12.5px] font-semibold text-acc-hover transition-colors hover:border-acc hover:bg-acc/[0.08]"
      >
        <span
          aria-hidden
          className="grid h-[30px] w-[30px] flex-none place-items-center rounded-[9px] bg-acc/[0.12] font-mono text-[13px] font-bold tabular-nums"
        >
          #{position + 1}
        </span>
        <span className="min-w-0 flex-1 truncate">
          {t("relay.placeItemHere", { name: currentItem?.title ?? "" })}
        </span>
        <Plus size={15} aria-hidden className="flex-none" />
      </button>
    );
  }

  return (
    // The item on the left, the ranking it goes into on the right — the same
    // two-column shape BlindRankBoard uses for the other rank_blind boards, at
    // the same 900px breakpoint. Full-width media made the video the whole
    // screen; a 132px thumbnail made it the smallest thing on it.
    <div className="grid items-start gap-4 min-[901px]:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {currentItem && (
        <div
          className={cn(
            "flex flex-col gap-3 rounded-card border p-4",
            isMyTurn
              ? "border-acc/40 bg-acc/[0.07]"
              : "border-border bg-surface-card",
          )}
        >
          <div className="flex items-baseline gap-3">
            {/* Plain <p> via `as`, with the colour on the element: `variant`
                would win over a text-* className (cn() is a plain join). */}
            <Text
              as="p"
              className="text-[11px] font-bold tracking-[0.12em] text-acc-hover uppercase"
            >
              {t("relay.currentItem")}
            </Text>
            <span className="ms-auto flex-none rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-foreground-secondary">
              {t("relay.stillHidden", { count: Math.max(0, remaining) })}
            </span>
          </div>

          {/* The item's own media. This was a hardcoded gradient block that
              never looked at the item, so relay placed a pack of music videos
              by title alone while every other board played them. A flex COLUMN,
              because as a flex row the player sizes to its content and
              collapses to nothing. */}
          <div className="flex flex-col">
            {currentVideoId ? (
              <YouTubeCard
                videoId={currentVideoId}
                startSeconds={extractYouTubeStart(currentItem.value)}
                className="rounded-control"
              />
            ) : currentItem.type === "image" ? (
              <ImageCard
                src={mediaUrl(currentItem.value)}
                alt={currentItem.title}
                className="rounded-control"
              />
            ) : (
              <span
                aria-hidden
                className="aspect-video w-full overflow-hidden rounded-control bg-[linear-gradient(150deg,#20303a,#0b0c0f)]"
              />
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-1">
            <Text className="text-[19px] font-bold tracking-[-0.015em] text-pretty">
              {currentItem.title}
            </Text>
            <Text variant="tertiary" className="text-[12.5px]">
              {t("relay.nobodyKnowsNext")}
            </Text>
          </div>
        </div>
      )}

      <section
        aria-label={t("relay.sharedRanking")}
        className="flex flex-col gap-[9px] rounded-card border border-border bg-surface-card p-[18px]"
      >
        <div className="flex items-baseline gap-[9px] pb-1">
          <Text as="h3" className="text-[13px] font-bold">
            {t("relay.sharedRanking")}
          </Text>
          <Text variant="tertiary" className="ms-auto text-[11.5px]">
            {t("relay.sharedRankingHint")}
          </Text>
        </div>

        {placed.map((_, position) => renderSlot(position))}
      </section>
    </div>
  );
}
