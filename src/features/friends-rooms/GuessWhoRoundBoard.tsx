"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import { BlindRankBoard } from "./BlindRankBoard";
import { LockedInRoster } from "./LockedInRoster";
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
 * click-to-place-next for `rank`) — the only genuinely NEW piece here is that
 * a locked-in choice shows only to the player who made it (LockedInRoster
 * shows everyone else only as "locked in", never what they chose).
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

  const myPick =
    myLastSelection?.[0] ??
    (pickedForRound?.roundIndex === round.index
      ? pickedForRound.optionId
      : null);

  function selectPick(optionId: string) {
    if (iAmLockedIn || !round || round.actionKind !== "pick") return;
    setPickedForRound({ roundIndex: round.index, optionId });
    onPick([optionId]);
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
          {round.name || t("guessWho.roundInstruction")}
        </Text>
        <Text variant="secondary" className="text-sm">
          {round.actionKind === "pick"
            ? t("guessWho.pickInstruction")
            : t("guessWho.rankInstruction")}
        </Text>
      </header>

      {round.actionKind === "pick" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {round.optionIds.map((optionId) => {
            const item = itemsById.get(optionId);
            const isMine = myPick === optionId;
            return (
              <button
                key={optionId}
                type="button"
                aria-pressed={isMine}
                disabled={iAmLockedIn}
                onClick={() => selectPick(optionId)}
                className={cn(
                  "rounded-card border-[1.5px] bg-surface p-4 text-start transition-colors",
                  isMine
                    ? "border-acc ring-[3px] ring-acc/30"
                    : "border-border hover:border-border-strong",
                  iAmLockedIn && !isMine && "opacity-50",
                )}
              >
                <Text className="font-semibold">{item?.title ?? optionId}</Text>
              </button>
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

      <LockedInRoster players={state.players} lockedIn={round.lockedIn ?? []} />
    </div>
  );
}
