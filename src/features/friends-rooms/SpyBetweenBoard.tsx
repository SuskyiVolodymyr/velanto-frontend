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
import type { RoomPlayerState, RoomState, SpyRoundResult } from "./room-types";

interface SpyBetweenBoardProps {
  state: RoomState;
  currentUserId: string | null;
  onNext: () => void;
}

/**
 * Spy's between-round beat: the round that just closed, with every pick landed
 * on the card that took it.
 *
 * The board is UN-REDACTED here, for the spy too. A resolved round has no
 * decision left in it, so holding it back would only stop the spy reading the
 * game they just played — and seeing what they were actually choosing between
 * is the payoff for having played it half-blind.
 */
export function SpyBetweenBoard({
  state,
  currentUserId,
  onNext,
}: SpyBetweenBoardProps) {
  const t = useTranslations("room");
  const rounds = state.results.filter(
    (result): result is SpyRoundResult => result.kind === "spy_round",
  );
  // The round still fresh in everyone's head.
  const closed = rounds.length > 0 ? rounds[rounds.length - 1] : null;

  const playerById = new Map(state.players.map((p) => [p.userId, p]));
  const pickersByOption = new Map<string, RoomPlayerState[]>();
  for (const [userId, ids] of Object.entries(closed?.picks ?? {})) {
    const optionId = ids[0];
    const player = playerById.get(userId);
    if (!optionId || !player) continue;
    pickersByOption.set(optionId, [
      ...(pickersByOption.get(optionId) ?? []),
      player,
    ]);
  }

  const itemsById = new Map((closed?.items ?? []).map((i) => [i.id, i]));

  // 1v1 keeps the head-to-head shape it was played under. No won/lost frame,
  // unlike Voting's: a Spy round has no shared verdict — the picks ARE the
  // evidence, and painting one card as "the answer" would put the room's
  // majority where the mode only ever shows individual choices.
  const isVersusPair =
    state.packFormat === "1v1" && (closed?.items.length ?? 0) === 2;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col gap-1">
          <Text variant="tertiary" className="text-xs tracking-wide uppercase">
            {t("spy.picksHeading")}
          </Text>
          <Text as="h2" variant="title" className="text-2xl">
            {closed?.name ?? t("spy.reveal.historyHeading")}
          </Text>
        </div>
        {/* On the title row, not under the board: the nxn arm puts this on
            its VS row for the same reason, and a grid of media has no divider
            row to share. Rendered here only for the arms that need it — the
            `sides` arm's copy lives in BetweenVsRow. */}
        {!closed?.sides && (
          <div className="ms-auto flex flex-wrap items-center justify-end gap-3">
            <BetweenNextButton
              state={state}
              currentUserId={currentUserId}
              onNext={onNext}
            />
          </div>
        )}
      </header>

      {closed && closed.sides ? (
        // nxn: a pick names a SIDE, so the picks are keyed by side id and would
        // never match an item.
        <div className="flex flex-col gap-[14px]">
          {closed.sides.map((side, index) => (
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
                // Named and faced, in the slot Guess-who fills with anonymous
                // labels: nothing about a Spy round is anonymous, and who took
                // which side is the mode's entire evidence base.
                voters={pickersByOption.get(side.id)}
              />
            </Fragment>
          ))}
        </div>
      ) : closed ? (
        <div
          className={cn(
            isVersusPair
              ? "grid items-center gap-5 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
              : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
          )}
        >
          {closed.items.map((item, index) => {
            const tile = (
              <RoundItemTile
                item={item}
                actionLabel={item.title}
                // Named, not a stack of anonymous avatars: the round is over,
                // and who chose what is the entire evidence base of the mode.
                voters={pickersByOption.get(item.id)}
              />
            );
            return isVersusPair ? (
              <Fragment key={item.id}>
                {index > 0 && <VsDivider />}
                {tile}
              </Fragment>
            ) : (
              <Fragment key={item.id}>{tile}</Fragment>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
