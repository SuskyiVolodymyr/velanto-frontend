"use client";

import { Fragment, useState } from "react";
import { useTranslations } from "next-intl";
import { BlindRankBoard } from "./BlindRankBoard";
import { labelTone } from "./guess-who-labels";
import { RoundItemTile } from "./RoundItemTile";
import { RoundSideTile } from "./RoundSideTile";
import { VsDivider } from "./VsDivider";
import type { RoomState } from "./room-types";

interface GuessWhoRoundBoardProps {
  state: RoomState;
  currentUserId: string | null;
  /** This player's own submitted selection this round, once locked in — the
   * ONLY selection this component is ever allowed to render (the server never
   * sends anyone else's). Undefined/null while still deciding. */
  myLastSelection?: string[] | null;
  onPick: (selection: string[]) => void;
}

/**
 * The Guess-who round board (design brief §4.3(d)): a blind pick (one option)
 * or a blind full ranking (click items into order), depending on
 * `round.actionKind`. Reuses the click-to-select vocabulary from the SOLO play
 * screens (CandidateCard's card grid for `pick`; RankPlayScreen's
 * click-to-place-next for `rank`).
 *
 * A PICK round is watchable while it runs: each label's choice marks the card
 * it took the moment it lands. A RANK round stays blind to the reveal — its
 * selection is a whole ordering, which no card can carry and which would give
 * away far more than "someone took this one".
 */
export function GuessWhoRoundBoard({
  state,
  currentUserId,
  myLastSelection,
  onPick,
}: GuessWhoRoundBoardProps) {
  const t = useTranslations("room");
  // The pick arm's own echo of what THIS player just clicked. The server
  // never sends anyone's selection back (that's the whole point of a blind
  // round), and nothing upstream tracks it either — `myLastSelection` is an
  // optional override that no current caller passes — so without this the
  // selected ring and `aria-pressed` could never turn on and clicking an
  // option gave no feedback at all. Stamped with the round index so it
  // self-invalidates when the round advances, rather than needing an effect.
  // The rank arm already works this way (BlindRankBoard's own `rankSoFar`).
  const [pickedForRound, setPickedForRound] = useState<{
    roundIndex: number;
    optionId: string;
  } | null>(null);
  const round = state.round;
  if (!round || !round.optionIds || !round.actionKind) return null;

  const me = state.players.find((p) => p.userId === currentUserId);
  const iAmLockedIn = Boolean(me && round.lockedIn?.includes(me.userId));
  const itemsById = new Map(round.items.map((item) => [item.id, item]));

  // Each label's pick lands here the moment they lock in, so the board is
  // watchable while people choose rather than only once the round closes.
  // Which real player holds a label is what stays hidden.
  const allLabels = state.labels ?? Object.keys(round.picks ?? {}).sort();
  const labelsByItem = new Map<
    string,
    { label: string; className: string }[]
  >();
  for (const [label, ids] of Object.entries(round.picks ?? {})) {
    const top = ids[0];
    if (!top) continue;
    labelsByItem.set(top, [
      ...(labelsByItem.get(top) ?? []),
      { label, className: labelTone(allLabels, label).chip },
    ]);
  }

  const myPick =
    myLastSelection?.[0] ??
    (pickedForRound?.roundIndex === round.index
      ? pickedForRound.optionId
      : null);

  // Gated on the FORMAT, not on "there happen to be two options": a save_one
  // round can draw two items, and a VS between them would claim a matchup the
  // round does not have. The length check is defensive — 1v1 is validated to
  // exactly one item a side.
  const isVersusPair =
    state.packFormat === "1v1" &&
    round.actionKind === "pick" &&
    round.optionIds.length === 2;

  function selectPick(optionId: string) {
    if (iAmLockedIn || !round || round.actionKind !== "pick") return;
    setPickedForRound({ roundIndex: round.index, optionId });
    onPick([optionId]);
  }

  return (
    <div className="flex flex-col gap-6">
      {round.sides ? (
        // nxn: the options are the round's two SIDES, not its items. Without
        // this arm the board had two ids it could resolve to nothing and
        // rendered an empty grid.
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
              actionLabel={t("guessWho.pickLabel", { name: side.name })}
              onPick={iAmLockedIn ? undefined : () => selectPick(side.id)}
              mine={myPick === side.id}
              pickLabels={labelsByItem.get(side.id)}
            />
          ))}
        </div>
      ) : isVersusPair ? (
        // 1v1: the round IS a matchup, so it reads as one — two contenders at
        // full half-width with a VS between them, the way solo play has always
        // drawn this format. In the generic grid below it was two cards in a
        // three-column layout: smaller than they needed to be, and saying
        // nothing about the pairing.
        <div className="grid items-center gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          {round.optionIds.map((optionId, index) => {
            const item = itemsById.get(optionId);
            if (!item) return null;
            const isMine = myPick === optionId;
            return (
              <Fragment key={optionId}>
                {index > 0 && <VsDivider />}
                <RoundItemTile
                  item={item}
                  actionLabel={t("guessWho.pickLabel", { name: item.title })}
                  onPick={iAmLockedIn ? undefined : () => selectPick(optionId)}
                  mine={isMine}
                  pickLabels={labelsByItem.get(optionId)}
                  badge={
                    isMine && iAmLockedIn
                      ? { label: t("board.lockedIn"), tone: "acc" }
                      : undefined
                  }
                />
              </Fragment>
            );
          })}
        </div>
      ) : round.actionKind === "pick" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {round.optionIds.map((optionId) => {
            const item = itemsById.get(optionId);
            if (!item) return null;
            const isMine = myPick === optionId;
            return (
              // RoundItemTile, not a bare title button: this board wrote its
              // own and so played no video and showed no image, leaving a pack
              // of music videos as a list of names while every other mode
              // played them. No `tally` or `people` — the round is blind.
              <RoundItemTile
                key={optionId}
                item={item}
                actionLabel={t("guessWho.pickLabel", { name: item.title })}
                onPick={iAmLockedIn ? undefined : () => selectPick(optionId)}
                mine={isMine}
                pickLabels={labelsByItem.get(optionId)}
                // Once locked in the tile is inert, so `aria-pressed` is gone
                // with the button — the badge is what still says, visibly and
                // to a screen reader, which one you sent.
                badge={
                  isMine && iAmLockedIn
                    ? { label: t("board.lockedIn"), tone: "acc" }
                    : undefined
                }
              />
            );
          })}
        </div>
      ) : (
        <BlindRankBoard
          optionIds={round.optionIds}
          itemsById={itemsById}
          disabled={iAmLockedIn}
          onSubmit={onPick}
        />
      )}

      {/* No LockedInRoster here: it names every player, which is exactly what
          this mode must not do while it is running. The chrome's Room panel
          shows the anonymous labels instead, and the progress count above the
          board says how many are in — see MaskedLabelRoster. */}
    </div>
  );
}
