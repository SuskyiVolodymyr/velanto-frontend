"use client";

import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import { PriorityHolderBadge } from "./PriorityHolderBadge";
import type { RoomState } from "./room-types";

interface VotingBoardProps {
  state: RoomState;
  currentUserId: string | null;
  onVote: (optionId: string) => void;
}

/**
 * Voting's round board (design brief §4.3(b)): every option from
 * `round.optionIds`, a live public tally (`round.votes` — no blind concept in
 * this mode), and the priority holder's badge shown BEFORE the round resolves
 * so the room knows whom a tie favors. Casting a vote is free to change at any
 * time before resolution — clicking a different option just re-votes.
 */
export function VotingBoard({
  state,
  currentUserId,
  onVote,
}: VotingBoardProps) {
  const t = useTranslations("room");
  const round = state.round;
  if (!round || !round.optionIds) return null;

  const votes = round.votes ?? {};
  const itemsById = new Map(round.items.map((item) => [item.id, item]));
  const totalVotes = Object.keys(votes).length;
  const myVote = currentUserId ? votes[currentUserId] : undefined;
  const priorityPlayer = state.players.find(
    (p) => p.userId === round.priorityUserId,
  );

  const tally = new Map<string, number>();
  for (const optionId of Object.values(votes)) {
    tally.set(optionId, (tally.get(optionId) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Text variant="tertiary" className="text-xs uppercase tracking-wide">
          {t("round.heading", {
            index: round.index + 1,
            total: state.totalRounds,
          })}
        </Text>
        <Text as="h2" variant="title" className="text-2xl">
          {round.name || t("voting.instruction")}
        </Text>
        {priorityPlayer && (
          <PriorityHolderBadge username={priorityPlayer.username} />
        )}
      </header>

      <div className="flex flex-col gap-3">
        {round.optionIds.map((optionId) => {
          const item = itemsById.get(optionId);
          const count = tally.get(optionId) ?? 0;
          const pct =
            totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isMine = myVote === optionId;
          return (
            <button
              key={optionId}
              type="button"
              aria-pressed={isMine}
              onClick={() => onVote(optionId)}
              className={cn(
                "relative overflow-hidden rounded-tile border-[1.5px] p-4 text-start transition-colors",
                isMine
                  ? "border-acc"
                  : "border-border hover:border-border-strong",
              )}
            >
              {/* The live tally bar — width is the vote-tally motion token
                  reserved in design-tokens.md ("vote-tally bar width .3s"). */}
              <span
                aria-hidden
                className="absolute inset-y-0 start-0 bg-acc/10 transition-[width] duration-300 ease-[var(--ease-signature)] motion-reduce:transition-none"
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between gap-3">
                <Text className="font-semibold">{item?.title ?? optionId}</Text>
                <Text variant="secondary" className="tabular-nums">
                  {count}
                </Text>
              </div>
            </button>
          );
        })}
      </div>

      <Text variant="secondary" aria-live="polite" className="text-sm">
        {t("voting.votedSoFar", {
          count: totalVotes,
          total: state.players.length,
        })}
      </Text>
    </div>
  );
}
