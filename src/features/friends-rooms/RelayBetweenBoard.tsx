"use client";

import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import type { RelayRoundResult, RoomState } from "./room-types";

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
    (r): r is RelayRoundResult => r.kind === "relay" && r.index === round?.index,
  );
  if (!round || !result) return null;

  const itemsById = new Map(result.items.map((item) => [item.id, item]));
  const playerByUserId = new Map(state.players.map((p) => [p.userId, p]));
  const me = state.players.find((p) => p.userId === currentUserId);
  const ready = state.players.filter((p) => p.next).length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Text variant="tertiary" className="text-xs uppercase tracking-wide">
          {t("relay.finalOrderHeading")}
        </Text>
      </header>

      <ol
        aria-label={t("relay.finalOrderHeading")}
        className="flex flex-col gap-2"
      >
        {result.order.map((itemId, index) => (
          <li
            key={itemId}
            className="flex items-center gap-3 rounded-tile border border-border bg-surface-card p-3"
          >
            <span className="flex h-7 w-7 flex-none items-center justify-center rounded-chip bg-white/[0.06] text-xs font-bold tabular-nums">
              {index + 1}
            </span>
            <Text className="font-semibold">
              {itemsById.get(itemId)?.title ?? itemId}
            </Text>
          </li>
        ))}
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
              <span>{itemsById.get(placement.itemId)?.title ?? placement.itemId}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text variant="secondary" aria-live="polite" className="text-sm">
          {t("between.ready", { count: ready, total: state.players.length })}
        </Text>
        <Button disabled={Boolean(me?.next)} onClick={onNext}>
          {t("between.next")}
          <ArrowRight size={16} aria-hidden />
        </Button>
      </div>
    </div>
  );
}
