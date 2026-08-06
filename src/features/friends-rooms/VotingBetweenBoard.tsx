"use client";

import { Fragment } from "react";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import { BetweenNextButton } from "./BetweenNextButton";
import { RoundItemTile } from "./RoundItemTile";
import { RevealSideRow } from "./RevealSideRow";
import { BetweenVsRow } from "./BetweenVsRow";
import { VsDivider } from "./VsDivider";
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

  // 1v1 keeps the matchup framing it was played under. The round board draws
  // this format as two contenders with a VS between them and then, the instant
  // the round closed, the reveal used to collapse it into a grid of small
  // cards — the head-to-head reading of it disappeared exactly when the answer
  // arrived. The length check is defensive; 1v1 is validated to two options.
  const isVersusPair =
    state.packFormat === "1v1" && result.optionIds.length === 2;

  return (
    <div className="flex flex-col gap-[18px]">
      <header className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col gap-1">
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
        </div>
        {/* On the title row, not under the board: the nxn arm puts this on
            its VS row for the same reason, and a grid of media has no divider
            row to share. Rendered here only for the arms that need it — the
            `sides` arm's copy lives in BetweenVsRow. */}
        {!round.sides && (
          <div className="ms-auto flex flex-wrap items-center justify-end gap-3">
            <BetweenNextButton
              state={state}
              currentUserId={currentUserId}
              onNext={onNext}
            />
          </div>
        )}
      </header>

      {/* The same two-up shape the round board used, so this reads as the round
          settling rather than as a different page. */}
      {round.sides ? (
        // The same stacked rows Guess-who's reveal and Spy's between board
        // draw, with the room's real names in the chip slot their labels take
        // — one screen family, one nxn shape. Two half-width side tiles put
        // the pool names on opposite edges and squeezed every video; this
        // reads down the page the way a versus round actually resolves.
        <div className="flex flex-col gap-[14px]">
          {round.sides.map((side, index) => (
            <Fragment key={side.id}>
              {index > 0 && (
                <BetweenVsRow
                  state={state}
                  currentUserId={currentUserId}
                  onNext={onNext}
                />
              )}
              <RevealSideRow
                side={side}
                items={side.itemIds
                  .map((id) => itemsById.get(id))
                  .filter((item): item is NonNullable<typeof item> =>
                    Boolean(item),
                  )}
                outcome={side.id === result.winnerOptionId ? "won" : "lost"}
                voters={votersFor(side.id)}
              />
            </Fragment>
          ))}
        </div>
      ) : (
        <div
          className={cn(
            isVersusPair
              ? "grid items-center gap-5 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
              : "grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(248px,1fr))]",
          )}
        >
          {result.optionIds.map((optionId, index) => {
            const item = itemsById.get(optionId);
            if (!item) return null;
            const won = optionId === result.winnerOptionId;
            const tile = (
              <RoundItemTile
                item={item}
                actionLabel={item.title}
                // On a versus pair the verdict is the whole point of the
                // screen, so it is carried in the frame — green for the one
                // the room went with, red for the one it dropped. An option
                // set of 3+ has one winner and N losers, where painting every
                // also-ran red would be noise rather than information.
                outcome={isVersusPair ? (won ? "won" : "lost") : undefined}
                leading={!isVersusPair && won}
                tally={{ count: result.tally[optionId] ?? 0, max: maxCount }}
                voters={votersFor(optionId)}
              />
            );
            return isVersusPair ? (
              <Fragment key={optionId}>
                {index > 0 && <VsDivider />}
                {tile}
              </Fragment>
            ) : (
              <Fragment key={optionId}>{tile}</Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}
