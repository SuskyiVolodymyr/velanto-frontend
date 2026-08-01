"use client";

import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { RoundItemTile } from "./RoundItemTile";
import { RoundSideTile } from "./RoundSideTile";
import type { RoomPlayerState, RoomState, VoteRoundResult } from "./room-types";

/**
 * Voting's between-round screen: what the room actually did.
 *
 * It used to print the winning option's title and nothing else — which on an
 * nxn round was a raw pool uuid (a vote there names a SIDE, not an item), and
 * on every round threw away the only thing worth pausing for: who voted for
 * what. Every option is laid out the way the board laid it out, each carrying
 * the people who chose it, with the winner marked.
 */
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

  const itemsById = new Map(result.items.map((item) => [item.id, item]));
  const playerById = new Map(state.players.map((p) => [p.userId, p]));
  const votersFor = (optionId: string): RoomPlayerState[] =>
    Object.entries(result.votes)
      .filter(([, voted]) => voted === optionId)
      .map(([userId]) => playerById.get(userId))
      .filter((p): p is RoomPlayerState => p !== undefined);

  const maxCount = Math.max(0, ...Object.values(result.tally));
  // The winner's own name for the heading: `sides` resolves an nxn option,
  // everything else is an item.
  const winnerName =
    round.sides?.find((side) => side.id === result.winnerOptionId)?.name ??
    itemsById.get(result.winnerOptionId)?.title ??
    result.winnerOptionId;

  const priorityPlayer = state.players.find(
    (p) => p.userId === result.priorityUserId,
  );
  const me = state.players.find((p) => p.userId === currentUserId);
  const ready = state.players.filter((p) => p.next).length;

  return (
    <div className="flex flex-col gap-[18px]">
      <header className="flex flex-col gap-1">
        <Text variant="tertiary" className="text-xs tracking-wide uppercase">
          {t("voting.winnerHeading")}
        </Text>
        <Text as="h2" variant="title" className="text-2xl text-live">
          {winnerName}
        </Text>
        {result.tieBroken && priorityPlayer && (
          <Text variant="secondary" className="text-sm">
            {t("voting.tieBrokenNote", { name: priorityPlayer.username })}
          </Text>
        )}
      </header>

      {/* The same two-up shape the round board used, so this reads as the round
          settling rather than as a different page. */}
      {round.sides ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {round.sides.map((side) => (
            <RoundSideTile
              key={side.id}
              side={side}
              items={side.itemIds
                .map((id) => itemsById.get(id))
                .filter((item): item is NonNullable<typeof item> =>
                  Boolean(item),
                )}
              actionLabel={side.name}
              leading={side.id === result.winnerOptionId}
              tally={{ count: result.tally[side.id] ?? 0, max: maxCount }}
              voters={votersFor(side.id)}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(248px,1fr))]">
          {result.optionIds.map((optionId) => {
            const item = itemsById.get(optionId);
            if (!item) return null;
            return (
              <RoundItemTile
                key={optionId}
                item={item}
                actionLabel={item.title}
                leading={optionId === result.winnerOptionId}
                tally={{ count: result.tally[optionId] ?? 0, max: maxCount }}
                voters={votersFor(optionId)}
              />
            );
          })}
        </div>
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
