"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
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
import { RoundChrome } from "./RoundChrome";
import { roundChromeConfig } from "./round-chrome-config";

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
  /** save_one or sacrifice_one — Claim's own save/sacrifice verb, off the room
   * snapshot. Not an action, so it's a sibling prop rather than in `actions`. */
  packFormat?: Extract<Pack["format"], "save_one" | "sacrifice_one">;
}

/**
 * The `phase === 'round'` dispatcher: picks the mode's board and gives it the
 * shared round chrome.
 *
 * Voting and Turn-based cut wrap themselves — each has an aside panel only that
 * board can build (the live tally, the cut log). The other four have nothing
 * extra to say on the right, so the chrome is applied here from one per-mode
 * config rather than repeated inside each of them.
 */
export function RoomRoundBoard({
  state,
  currentUserId,
  actions,
  packFormat,
}: RoomRoundBoardProps) {
  const t = useTranslations("room");
  const rejection = (
    <RoundRejectionNotice reason={actions.lastModeRejection?.reason ?? null} />
  );

  if (state.mode === "voting") {
    return (
      <>
        {rejection}
        <VotingBoard
          state={state}
          currentUserId={currentUserId}
          onVote={actions.vote}
        />
      </>
    );
  }

  if (state.mode === "turn_based_cut") {
    return (
      <>
        {rejection}
        <TurnBasedCutBoard
          state={state}
          currentUserId={currentUserId}
          onCut={actions.cut}
        />
      </>
    );
  }

  let board: ReactNode = null;
  switch (state.mode) {
    case "claim":
      board = (
        <RoomRound
          state={state}
          currentUserId={currentUserId}
          lastRejection={actions.lastRejection}
          onClaim={actions.claim}
          packFormat={packFormat}
        />
      );
      break;
    case "guess_who":
      board = (
        <GuessWhoRoundBoard
          state={state}
          currentUserId={currentUserId}
          onPick={actions.pick}
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

  const chrome = roundChromeConfig(state, currentUserId, t);
  if (!chrome) return board;

  return (
    <>
      {/* Claim surfaces its own rejection inside RoomRound (the too-fast note
          and the item flash); every other mode's was reaching state and being
          rendered by nobody — you clicked, the server refused, and the board
          looked identical either way. */}
      {state.mode !== "claim" && rejection}
      <RoundChrome
        state={state}
        question={chrome.question}
        progressNote={chrome.progressNote}
        call={chrome.call}
        status={chrome.status}
        currentUserId={currentUserId}
        asidePanel={chrome.asidePanel}
      >
        {board}
      </RoundChrome>
    </>
  );
}
