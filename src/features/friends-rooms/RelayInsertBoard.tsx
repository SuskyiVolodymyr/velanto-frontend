"use client";

import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
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
  const remaining = round.items.length - placed.length - (currentItem ? 1 : 0);

  // Who placed which item. `relayPlacements` is in placement order, not slot
  // order, so it is indexed by item rather than by position.
  const placerByItem = new Map(
    (round.relayPlacements ?? []).map((p) => [p.itemId, p.userId]),
  );

  // A plain render-helper function, not a nested component definition —
  // deliberately lowercase and called directly (`renderGap(0)`, never
  // `<Gap .../>`) so nothing gets remounted (and loses state) on every
  // parent re-render, which is what defining a component inside another
  // component's render body would otherwise cause.
  function renderGap(position: number) {
    if (!isMyTurn || !currentItemId) {
      return <div aria-hidden className="h-1.5 w-full" />;
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
          className="absolute text-foreground-tertiary opacity-0 transition-opacity group-hover:text-acc group-hover:opacity-100"
        />
      </button>
    );
  }

  return (
    <>
      {currentItem && (
        <div
          className={cn(
            "flex flex-wrap items-center gap-3.5 rounded-card border p-4",
            isMyTurn
              ? "border-acc/40 bg-acc/[0.07]"
              : "border-border bg-surface-card",
          )}
        >
          <span
            aria-hidden
            className="aspect-video w-[132px] flex-none overflow-hidden rounded-control bg-[linear-gradient(150deg,#20303a,#0b0c0f)]"
          />
          <div className="flex min-w-0 flex-col gap-1">
            {/* Plain <p> via `as`, with the colour on the element: `variant`
                would win over a text-* className (cn() is a plain join). */}
            <Text
              as="p"
              className="text-[11px] font-bold tracking-[0.12em] text-acc-hover uppercase"
            >
              {t("relay.currentItem")}
            </Text>
            <Text className="text-[19px] font-bold tracking-[-0.015em]">
              {currentItem.title}
            </Text>
            <Text variant="tertiary" className="text-[12.5px]">
              {t("relay.nobodyKnowsNext")}
            </Text>
          </div>
          <span className="ms-auto rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-foreground-secondary">
            {t("relay.stillHidden", { count: Math.max(0, remaining) })}
          </span>
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

        {renderGap(0)}
        {placed.map((itemId, index) => {
          const placer = placerByItem.get(itemId);
          const player = placer ? playerById.get(placer) : undefined;
          return (
            <div key={itemId} className="flex flex-col">
              <div className="flex items-center gap-3 rounded-tile border border-border bg-background p-[11px_13px]">
                <span className="grid h-[30px] w-[30px] flex-none place-items-center rounded-[9px] bg-white/[0.06] font-mono text-[13px] font-bold tabular-nums">
                  {index + 1}
                </span>
                <Text className="min-w-0 truncate text-sm font-semibold">
                  {itemsById.get(itemId)?.title ?? itemId}
                </Text>
                {player && (
                  <span className="ms-auto flex flex-none items-center gap-[7px]">
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
              {renderGap(index + 1)}
            </div>
          );
        })}

        {placed.length === 0 && !isMyTurn && (
          <Text variant="tertiary" className="py-3.5 text-center text-xs">
            {t("relay.nothingPlacedYet")}
          </Text>
        )}
      </section>
    </>
  );
}
