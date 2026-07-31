"use client";

import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import { TurnIndicator } from "./TurnIndicator";
import type { RoomState } from "./room-types";

interface RelayInsertBoardProps {
  state: RoomState;
  currentUserId: string | null;
  onPlaceItem: (itemId: string, position: number) => void;
}

/**
 * Relay's round board (design brief §4.3(f); this plan's D2 decision point).
 * The whole room builds ONE shared ranking, turn by turn: the player whose
 * turn it is inserts the CURRENT item into the partial ranking at a chosen
 * position — click-a-gap, not drag-and-drop (D2). N placed items -> N+1 gap
 * buttons (before the first, between every pair, after the last); clicking
 * gap `i` calls `onPlaceItem(currentItemId, i)`, matching the wire's
 * `{itemId, position}` shape exactly (velanto-backend
 * friends-rooms.gateway.ts's `readPlacement`).
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
  const placed = round.relayPlaced;
  const currentItem = round.relayCurrentItemId
    ? itemsById.get(round.relayCurrentItemId)
    : null;
  const isMyTurn = round.turnUserId === currentUserId;
  const currentItemId = round.relayCurrentItemId;

  // A plain render-helper function, not a nested component definition —
  // deliberately lowercase and called directly (`renderGap(0)`, never
  // `<Gap .../>`) so nothing gets remounted (and loses state) on every
  // parent re-render, which is what defining a component inside another
  // component's render body would otherwise cause.
  function renderGap(position: number) {
    if (!isMyTurn || !currentItemId) {
      return <div aria-hidden className="h-2 w-full" />;
    }
    // Every gap used to share the one label "Insert here", leaving N+1
    // buttons indistinguishable to screen-reader and voice-control users
    // ("click Insert here" — which one?). Name each gap by the item it lands
    // in front of, and the trailing gap by where it lands.
    const before = placed[position];
    const label =
      placed.length === 0
        ? t("relay.insertHere")
        : before !== undefined
          ? t("relay.insertBefore", {
              title: itemsById.get(before)?.title ?? before,
            })
          : t("relay.insertAtEnd");
    return (
      <button
        type="button"
        onClick={() => onPlaceItem(currentItemId, position)}
        aria-label={label}
        className="group relative flex h-6 w-full items-center justify-center"
      >
        <span className="h-[2px] w-full rounded-pill bg-white/[0.08] transition-colors group-hover:bg-acc" />
        <Plus
          size={14}
          aria-hidden
          className="absolute text-foreground-tertiary opacity-0 transition-opacity group-hover:opacity-100 group-hover:text-acc"
        />
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <TurnIndicator
        players={state.players}
        turnUserId={round.turnUserId ?? null}
        currentUserId={currentUserId}
      />

      {currentItem && (
        <div className="w-full max-w-[230px] self-center overflow-hidden rounded-card border-[1.5px] border-acc bg-background p-4 ring-4 ring-acc/[0.16]">
          {/* Plain <p>, not <Text>: same variant/className color-precedence
              gotcha as Tasks 10/17/20 — text-acc would lose to the
              "tertiary" variant's own text-foreground-tertiary. */}
          <p className="text-[11px] font-medium uppercase tracking-wide text-acc">
            {t("relay.currentItem")}
          </p>
          <Text className="font-semibold">{currentItem.title}</Text>
        </div>
      )}

      <div className="relative flex flex-col">
        {renderGap(0)}
        {placed.map((itemId, index) => (
          <div key={itemId} className="flex flex-col">
            <div
              className={cn(
                "flex items-center gap-3 rounded-tile border border-border bg-surface-card p-3",
              )}
            >
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-chip bg-white/[0.06] text-xs font-bold tabular-nums">
                {index + 1}
              </span>
              <Text className="font-semibold">
                {itemsById.get(itemId)?.title ?? itemId}
              </Text>
            </div>
            {renderGap(index + 1)}
          </div>
        ))}
      </div>
    </div>
  );
}
