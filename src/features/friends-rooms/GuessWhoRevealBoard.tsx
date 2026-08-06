"use client";

import { Fragment } from "react";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import { labelTone } from "./guess-who-labels";
import { BetweenNextButton } from "./BetweenNextButton";
import { RoundItemTile } from "./RoundItemTile";
import { RevealSideRow } from "./RevealSideRow";
import { RevealRankingTable } from "./RevealRankingTable";
import { BetweenVsRow } from "./BetweenVsRow";
import { VsDivider } from "./VsDivider";
import type { RevealRoundResult, RoomState } from "./room-types";

interface GuessWhoRevealBoardProps {
  state: RoomState;
  currentUserId: string | null;
  onNext: () => void;
}

/**
 * Guess-who's reveal (design brief §4.3(d)): the round you were just looking at,
 * with each anonymous label's pick landed on the card it took.
 *
 * Deliberately NOT a screen of its own. It used to render a chronology table of
 * every round so far, which pulled the room off the board mid-game to read a
 * spreadsheet — and the results screen already carries that history
 * (GuessWhoLabelTable), where reviewing it is the actual task. Here the job is
 * one beat: see who took what, and move on.
 */
export function GuessWhoRevealBoard({
  state,
  currentUserId,
  onNext,
}: GuessWhoRevealBoardProps) {
  const t = useTranslations("room");
  const reveals = state.results.filter(
    (r): r is RevealRoundResult => r.kind === "reveal",
  );
  const labels = Array.from(
    new Set(reveals.flatMap((r) => Object.keys(r.picks))),
  ).sort();

  // The round that just closed — the last reveal, which is the one whose cards
  // are still fresh in everyone's head.
  const closed = reveals.length > 0 ? reveals[reveals.length - 1] : null;
  const labelsByItem = new Map<
    string,
    { label: string; className: string }[]
  >();
  for (const [label, ids] of Object.entries(closed?.picks ?? {})) {
    // A rank_blind round's "pick" is a whole ordering; only its FIRST entry
    // reads as a choice, exactly as the label table treats it.
    const top = ids[0];
    if (!top) continue;
    labelsByItem.set(top, [
      ...(labelsByItem.get(top) ?? []),
      { label, className: labelTone(labels, label).chip },
    ]);
  }

  const itemsById = new Map(
    (closed?.items ?? []).map((item) => [item.id, item]),
  );

  const myLabel =
    state.players.find((p) => p.userId === currentUserId)?.label ?? null;

  // A rank_blind pick is a whole ordering rather than a choice, so this round
  // has no card to mark — it has N orderings to compare.
  const isRanked = state.packFormat === "rank_blind";

  // 1v1 keeps the head-to-head shape it was played under. No won/lost frame
  // here, unlike Voting's: a Guess-who round has no verdict at all — the two
  // cards are evidence, and colouring one would invent a winner the mode
  // never declares.
  const isVersusPair =
    state.packFormat === "1v1" && (closed?.items.length ?? 0) === 2;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col gap-1">
          <Text variant="tertiary" className="text-xs uppercase tracking-wide">
            {t("guessWho.revealHeading")}
          </Text>
          <Text as="h2" variant="title" className="text-2xl">
            {t("guessWho.trajectoryHeading")}
          </Text>
        </div>
        {/* On the title row, not under the board: the nxn arm puts this on
            its VS row for the same reason, and a grid of media has no divider
            row to share. Rendered here only for the arms that need it — the
            `sides` arm's copy lives in BetweenVsRow. */}
        {!state.round?.sides && (
          <div className="ms-auto flex flex-wrap items-center justify-end gap-3">
            <BetweenNextButton
              state={state}
              currentUserId={currentUserId}
              onNext={onNext}
            />
          </div>
        )}
      </header>

      {/* The round's own cards, marked with the label that took each — the
          brief's blind-then-reveal beat. The table below is the game's memory;
          this is the round still fresh in everyone's head, with the media they
          picked from. Only reachable once every player is locked in, so
          revealing here cannot help anyone copy. */}
      {closed && isRanked ? (
        // rank_blind: a pick is a whole ORDERING, so there is no card to mark
        // — one table per label, laid side by side. Comparing them IS the
        // deduction this mode is for.
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
          {labels.map((label) => {
            const ranked = (closed.picks[label] ?? [])
              .map((id) => itemsById.get(id))
              .filter((item): item is NonNullable<typeof item> =>
                Boolean(item),
              );
            if (ranked.length === 0) return null;
            return (
              <RevealRankingTable
                key={label}
                label={label}
                className={labelTone(labels, label).chip}
                items={ranked}
                mine={label === myLabel}
              />
            );
          })}
        </div>
      ) : closed && state.round?.sides ? (
        // nxn: a pick names a SIDE, so the chips are keyed by side id and never
        // matched an item — the reveal showed every video and not one pick.
        // Two stacked rows with a VS between, exactly as a solo nxn round
        // reads, each row carrying the labels that took that side.
        <div className="flex flex-col gap-[14px]">
          {state.round.sides.map((side, index) => (
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
                pickLabels={labelsByItem.get(side.id)}
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
                pickLabels={labelsByItem.get(item.id)}
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
