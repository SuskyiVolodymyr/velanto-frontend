"use client";

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
  switch (state.mode) {
    case "claim":
      return (
        <RoomRound
          state={state}
          currentUserId={currentUserId}
          lastRejection={actions.lastRejection}
          onClaim={actions.claim}
          packFormat={packFormat}
        />
      );
    case "guess_who":
      return (
        <GuessWhoRoundBoard
          state={state}
          currentUserId={currentUserId}
          onPick={actions.pick}
        />
      );
    case "turn_based_cut":
      return (
        <TurnBasedCutBoard
          state={state}
          currentUserId={currentUserId}
          packFormat={packFormat}
          onCut={actions.cut}
        />
      );
    case "voting":
      return (
        <VotingBoard
          state={state}
          currentUserId={currentUserId}
          onVote={actions.vote}
        />
      );
    case "shared_grid":
      return (
        <SharedGridRankSubmission
          state={state}
          currentUserId={currentUserId}
          onSubmitRanking={actions.submitRanking}
        />
      );
    case "relay":
      return (
        <RelayInsertBoard
          state={state}
          currentUserId={currentUserId}
          onPlaceItem={actions.placeItem}
        />
      );
    default:
      return null;
  }
}
