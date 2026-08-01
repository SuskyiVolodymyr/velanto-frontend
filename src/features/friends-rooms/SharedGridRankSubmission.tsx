"use client";

import { BlindRankBoard } from "./BlindRankBoard";
import { LockedInRoster } from "./LockedInRoster";
import type { RoomState } from "./room-types";

interface SharedGridRankSubmissionProps {
  state: RoomState;
  currentUserId: string | null;
  onSubmitRanking: (ranking: string[]) => void;
  /** Bumped by the parent every time a ranking is rejected. BlindRankBoard
   * auto-submits on the final click and then disables every button, so a
   * rejected ranking would otherwise strand the player with a full, frozen
   * board and no way to retry for the rest of the round. Used as a remount
   * key, which is the whole reset. */
  rejectionToken?: number;
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
  rejectionToken = 0,
}: SharedGridRankSubmissionProps) {
  const round = state.round;
  if (!round || !round.optionIds) return null;

  const me = state.players.find((p) => p.userId === currentUserId);
  const iAmLockedIn = Boolean(me && round.lockedIn?.includes(me.userId));
  const itemsById = new Map(round.items.map((item) => [item.id, item]));

  return (
    <div className="flex flex-col gap-6">
      <BlindRankBoard
        key={`${round.index}:${rejectionToken}`}
        optionIds={round.optionIds}
        itemsById={itemsById}
        disabled={iAmLockedIn}
        onSubmit={onSubmitRanking}
      />

      <LockedInRoster players={state.players} lockedIn={round.lockedIn ?? []} />
    </div>
  );
}
