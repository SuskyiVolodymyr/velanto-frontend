"use client";

import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { BlindRankBoard } from "./BlindRankBoard";
import { LockedInRoster } from "./LockedInRoster";
import type { RoomState } from "./room-types";

interface SharedGridRankSubmissionProps {
  state: RoomState;
  currentUserId: string | null;
  onSubmitRanking: (ranking: string[]) => void;
}

/**
 * Shared-grid's round board (design brief §4.3(e)): the SAME click-to-place
 * blind ranking as the solo rank_blind flow, done in parallel by everyone in
 * the room — reuses BlindRankBoard (Task 23) and LockedInRoster (Task 11)
 * wholesale, adding only the round chrome.
 */
export function SharedGridRankSubmission({
  state,
  currentUserId,
  onSubmitRanking,
}: SharedGridRankSubmissionProps) {
  const t = useTranslations("room");
  const round = state.round;
  if (!round || !round.optionIds) return null;

  const me = state.players.find((p) => p.userId === currentUserId);
  const iAmLockedIn = Boolean(me && round.lockedIn?.includes(me.userId));
  const itemsById = new Map(round.items.map((item) => [item.id, item]));

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
          {round.name || t("sharedGrid.instruction")}
        </Text>
      </header>

      <BlindRankBoard
        optionIds={round.optionIds}
        itemsById={itemsById}
        disabled={iAmLockedIn}
        onSubmit={onSubmitRanking}
      />

      <LockedInRoster players={state.players} lockedIn={round.lockedIn ?? []} />
    </div>
  );
}
