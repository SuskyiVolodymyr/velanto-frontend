"use client";

import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import type { BordaRoundResult, RoomState } from "./room-types";

export function BordaRevealBoard({
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
    (r): r is BordaRoundResult => r.kind === "borda" && r.index === round?.index,
  );
  if (!round || !result) return null;

  const itemsById = new Map(result.items.map((item) => [item.id, item]));
  const me = state.players.find((p) => p.userId === currentUserId);
  const ready = state.players.filter((p) => p.next).length;

  let rank = 1;
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Text variant="tertiary" className="text-xs uppercase tracking-wide">
          {t("sharedGrid.aggregateHeading")}
        </Text>
        <Text as="h2" variant="title" className="text-2xl">
          {t("sharedGrid.groupRanking")}
        </Text>
      </header>

      <ol className="flex flex-col gap-2">
        {result.order.map((tier, tierIndex) => {
          const rowRank = rank;
          rank += tier.length;
          const tied = tier.length > 1;
          return (
            <li
              key={tierIndex}
              className={cn(
                "flex flex-col gap-1 rounded-tile border p-3",
                tierIndex === 0
                  ? "border-score/40 bg-score/10"
                  : "border-border bg-surface-card",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-chip bg-white/[0.06] text-xs font-bold tabular-nums">
                  {rowRank}
                </span>
                {tier.map((itemId) => (
                  <Text key={itemId} className="font-semibold">
                    {itemsById.get(itemId)?.title ?? itemId}
                  </Text>
                ))}
                <Text variant="tertiary" className="ms-auto text-xs tabular-nums">
                  {t("sharedGrid.pointsLabel", {
                    count: result.scores[tier[0]] ?? 0,
                  })}
                </Text>
              </div>
              {tied && (
                <Text variant="tertiary" className="text-xs">
                  {t("sharedGrid.tiedNote", { count: tier.length })}
                </Text>
              )}
            </li>
          );
        })}
      </ol>

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
