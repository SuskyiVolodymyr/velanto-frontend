"use client";

import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import type { RelayRoundResult, RoomState } from "./room-types";
import { BetweenNextButton } from "./BetweenNextButton";

export function RelayBetweenBoard({
  state,
  currentUserId,
  onNext,
}: {
  state: RoomState;
  currentUserId: string | null;
  onNext: () => void;
}) {
  const t = useTranslations("room");
  const round = state.round;
  const result = state.results.find(
    (r): r is RelayRoundResult =>
      r.kind === "relay" && r.index === round?.index,
  );
  if (!round || !result) return null;

  const itemsById = new Map(result.items.map((item) => [item.id, item]));
  const playerByUserId = new Map(state.players.map((p) => [p.userId, p]));
  // itemId -> whoever placed it. A relay round places each item exactly once,
  // so the last writer wins is the only writer.
  const placedByItem = new Map(
    result.placements.map((placement) => [placement.itemId, placement.userId]),
  );

  return (
    <div className="flex flex-col gap-6">
      {/* An eyebrow with nothing under it: this screen's only heading was a
          caps label, so the page opened with no title at all. The round's own
          name is what it is — the same thing every other between board heads
          itself with — and the advance control rides the row, because down in
          a footer it sat below the whole ranking. */}
      <header className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col gap-1">
          <Text variant="tertiary" className="text-xs tracking-wide uppercase">
            {t("relay.finalOrderHeading")}
          </Text>
          <Text as="h2" variant="title" className="text-2xl">
            {round.name || t("relay.finalOrderHeading")}
          </Text>
        </div>
        <div className="ms-auto flex flex-wrap items-center justify-end gap-3">
          <BetweenNextButton
            state={state}
            currentUserId={currentUserId}
            onNext={onNext}
          />
        </div>
      </header>

      <ol
        aria-label={t("relay.finalOrderHeading")}
        className="flex flex-col gap-2"
      >
        {result.order.map((itemId, index) => {
          const item = itemsById.get(itemId);
          const placedBy = playerByUserId.get(placedByItem.get(itemId) ?? "");
          return (
            <li
              key={itemId}
              className="flex items-center gap-3 rounded-tile border border-border bg-surface-card p-3"
            >
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-chip bg-white/[0.06] text-xs font-bold tabular-nums">
                {index + 1}
              </span>
              <Text className="min-w-0 flex-1 font-semibold">
                {item?.title ?? itemId}
              </Text>
              {/* Who put it there, on the row it belongs to — the history list
                  below says the same thing in prose, but this is where you are
                  looking. */}
              {placedBy && (
                <span className="flex flex-none items-center gap-1.5 rounded-full border border-border bg-white/[0.04] py-0.5 pe-2 ps-0.5 text-[11.5px] font-semibold text-foreground-secondary">
                  <UserAvatar
                    username={placedBy.username}
                    avatarKey={placedBy.avatarKey}
                    tone
                    className="h-[18px] w-[18px] flex-none rounded-full text-[8px]"
                  />
                  {placedBy.username}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <div className="flex flex-col gap-2">
        <Text variant="secondary" className="text-sm">
          {t("relay.placementHistoryHeading")}
        </Text>
        <ol
          aria-label={t("relay.placementHistoryHeading")}
          className="flex flex-wrap items-center gap-2"
        >
          {result.placements.map((placement, index) => (
            <li
              key={`${placement.userId}-${placement.itemId}-${index}`}
              className="flex items-center gap-1.5 rounded-pill border border-border bg-surface px-2.5 py-1 text-xs"
            >
              <span className="font-semibold">
                {playerByUserId.get(placement.userId)?.username ??
                  placement.userId}
              </span>
              <span className="text-foreground-tertiary">
                {t("relay.placedVerb")}
              </span>
              <span>
                {itemsById.get(placement.itemId)?.title ?? placement.itemId}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
