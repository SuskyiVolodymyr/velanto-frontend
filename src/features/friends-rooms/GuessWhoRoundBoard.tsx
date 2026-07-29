"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
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
  const round = state.round;
  const [rankSoFar, setRankSoFar] = useState<string[]>([]);
  if (!round || !round.optionIds || !round.actionKind) return null;

  const me = state.players.find((p) => p.userId === currentUserId);
  const iAmLockedIn = Boolean(me && round.lockedIn?.includes(me.userId));
  const itemsById = new Map(round.items.map((item) => [item.id, item]));

  function selectPick(optionId: string) {
    if (iAmLockedIn || round?.actionKind !== "pick") return;
    onPick([optionId]);
  }

  function selectRankNext(optionId: string) {
    if (
      iAmLockedIn ||
      round?.actionKind !== "rank" ||
      rankSoFar.includes(optionId)
    ) {
      return;
    }
    const next = [...rankSoFar, optionId];
    setRankSoFar(next);
    if (next.length === round.optionIds!.length) onPick(next);
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
            const isMine = myLastSelection?.[0] === optionId;
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
        <div className="flex flex-col gap-2">
          {round.optionIds.map((optionId) => {
            const item = itemsById.get(optionId);
            const placedAt = rankSoFar.indexOf(optionId);
            const placed = placedAt !== -1;
            return (
              <button
                key={optionId}
                type="button"
                disabled={iAmLockedIn || placed}
                onClick={() => selectRankNext(optionId)}
                className={cn(
                  "flex items-center gap-3 rounded-tile border-[1.5px] p-[14px] text-start transition-colors",
                  placed
                    ? "border-border opacity-60"
                    : "border-dashed border-white/[0.14] hover:border-acc/40",
                )}
              >
                <span
                  aria-hidden
                  className="flex h-8 w-8 flex-none items-center justify-center rounded-chip bg-white/[0.06] text-[12px] font-semibold"
                >
                  {placed ? placedAt + 1 : ""}
                </span>
                <Text className="flex-1 text-sm font-semibold">
                  {item?.title ?? optionId}
                </Text>
              </button>
            );
          })}
        </div>
      )}

      <LockedInRoster players={state.players} lockedIn={round.lockedIn ?? []} />
    </div>
  );
}
