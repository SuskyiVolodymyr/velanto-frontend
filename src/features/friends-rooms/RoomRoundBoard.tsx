"use client";

import type { ReactNode } from "react";
import type { Pack } from "@/src/shared/types/pack";
import type {
  ClaimRejection,
  CutRejection,
  GuessWhoRejection,
  RelayRejection,
  RoomState,
  SharedGridRejection,
  VoteRejection,
} from "./room-types";
import { RoomRound } from "./RoomRound";
import { GuessWhoRoundBoard } from "./GuessWhoRoundBoard";
import { TurnBasedCutBoard } from "./TurnBasedCutBoard";
import { VotingBoard } from "./VotingBoard";
import { SharedGridRankSubmission } from "./SharedGridRankSubmission";
import { RelayInsertBoard } from "./RelayInsertBoard";
import { RoundRejectionNotice } from "./RoundRejectionNotice";

/** Every round-scoped action a board might need, keyed by mode so each board
 * only destructures what its own mode uses. */
export interface RoomRoundActions {
  claim: (itemId: string) => void;
  cut: (itemId: string) => void;
  pick: (selection: string[]) => void;
  vote: (optionId: string) => void;
  submitRanking: (ranking: string[]) => void;
  placeItem: (itemId: string, position: number) => void;
  lastRejection: ClaimRejection | null;
  lastModeRejection:
    | (CutRejection & { kind: "cut" })
    | (GuessWhoRejection & { kind: "pick" })
    | (VoteRejection & { kind: "vote" })
    | (SharedGridRejection & { kind: "ranking" })
    | (RelayRejection & { kind: "place" })
    | null;
  /** Increments on every rejection, so a repeat refusal is distinguishable
   * from the one already on screen. Shared-grid keys its rank board on it. */
  modeRejectionSeq: number;
}

interface RoomRoundBoardProps {
  state: RoomState;
  currentUserId: string | null;
  actions: RoomRoundActions;
  /** save_one or sacrifice_one — Claim's own save/sacrifice verb. Request-
   * derived data (RoomScreen fetches the pack once), not an action, so it's
   * a sibling prop rather than folded into `actions`. */
  packFormat?: Extract<Pack["format"], "save_one" | "sacrifice_one">;
}

/**
 * The `phase === 'round'` dispatcher — switches on `state.mode` to the right
 * board. Claim's arm is the existing, unchanged `RoomRound`; every other
 * mode's board is added by that mode's own task group (Tasks 12/18/21/23/25).
 */
export function RoomRoundBoard({
  state,
  currentUserId,
  actions,
  packFormat,
}: RoomRoundBoardProps) {
  // Claim surfaces its own rejection inside RoomRound (the too-fast note and
  // the item flash), so it is the one arm that opts out of the shared notice.
  if (state.mode === "claim") {
    return (
      <RoomRound
        state={state}
        currentUserId={currentUserId}
        lastRejection={actions.lastRejection}
        onClaim={actions.claim}
        packFormat={packFormat}
      />
    );
  }

  let board: ReactNode = null;
  switch (state.mode) {
    case "guess_who":
      board = (
        <GuessWhoRoundBoard
          state={state}
          currentUserId={currentUserId}
          onPick={actions.pick}
        />
      );
      break;
    case "turn_based_cut":
      board = (
        <TurnBasedCutBoard
          state={state}
          currentUserId={currentUserId}
          onCut={actions.cut}
        />
      );
      break;
    case "voting":
      board = (
        <VotingBoard
          state={state}
          currentUserId={currentUserId}
          onVote={actions.vote}
        />
      );
      break;
    case "shared_grid":
      board = (
        <SharedGridRankSubmission
          state={state}
          currentUserId={currentUserId}
          onSubmitRanking={actions.submitRanking}
          rejectionToken={actions.modeRejectionSeq}
        />
      );
      break;
    case "relay":
      board = (
        <RelayInsertBoard
          state={state}
          currentUserId={currentUserId}
          onPlaceItem={actions.placeItem}
        />
      );
      break;
    default:
      return null;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Every non-Claim rejection was reaching state and being rendered by
          nobody — you clicked, the server refused, and the board looked
          identical either way. Rendered once here rather than five times. */}
      <RoundRejectionNotice
        reason={actions.lastModeRejection?.reason ?? null}
      />
      {board}
    </div>
  );
}
