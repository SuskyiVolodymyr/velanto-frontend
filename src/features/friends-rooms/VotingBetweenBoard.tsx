"use client";

import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import type { RoomState, VoteRoundResult } from "./room-types";

export function VotingBetweenBoard({
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
    (r): r is VoteRoundResult => r.kind === "vote" && r.index === round?.index,
  );
  if (!round || !result) return null;

  const winner = result.items.find((item) => item.id === result.winnerOptionId);
  const priorityPlayer = state.players.find(
    (p) => p.userId === result.priorityUserId,
  );
  const me = state.players.find((p) => p.userId === currentUserId);
  const ready = state.players.filter((p) => p.next).length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Text variant="tertiary" className="text-xs uppercase tracking-wide">
          {t("voting.winnerHeading")}
        </Text>
        <Text as="h2" variant="title" className="text-2xl text-live">
          {winner?.title ?? result.winnerOptionId}
        </Text>
      </header>

      {result.tieBroken && priorityPlayer && (
        <Text variant="secondary" className="text-sm">
          {t("voting.tieBrokenNote", { name: priorityPlayer.username })}
        </Text>
      )}

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
