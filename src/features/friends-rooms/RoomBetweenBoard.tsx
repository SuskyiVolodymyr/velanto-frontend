"use client";

import type { Pack } from "@/src/shared/types/pack";
import type { RoomState } from "./room-types";
import { RoomBetween } from "./RoomBetween";
import { GuessWhoRevealBoard } from "./GuessWhoRevealBoard";
import { VotingBetweenBoard } from "./VotingBetweenBoard";
import { BordaRevealBoard } from "./BordaRevealBoard";
import { RelayBetweenBoard } from "./RelayBetweenBoard";
import { SpyBetweenBoard } from "./SpyBetweenBoard";

interface RoomBetweenBoardProps {
  state: RoomState;
  currentUserId: string | null;
  onNext: () => void;
  /** save_one or sacrifice_one — Claim's own save/sacrifice verb. */
  packFormat?: Extract<Pack["format"], "save_one" | "sacrifice_one">;
}

/** The `phase === 'between'` dispatcher — mirrors RoomRoundBoard exactly. */
export function RoomBetweenBoard({
  state,
  currentUserId,
  onNext,
  packFormat,
}: RoomBetweenBoardProps) {
  switch (state.mode) {
    case "claim":
      return (
        <RoomBetween
          state={state}
          currentUserId={currentUserId}
          onNext={onNext}
          packFormat={packFormat}
        />
      );
    case "guess_who":
      return (
        <GuessWhoRevealBoard
          state={state}
          currentUserId={currentUserId}
          onNext={onNext}
        />
      );
    case "turn_based_cut":
      // Turn-based cut's resolved round is still `kind: "survivor"` (Task 1's
      // SurvivorRoundResult carries an optional `cuts` field precisely for
      // this mode) — reuses RoomBetween exactly like Claim does.
      return (
        <RoomBetween
          state={state}
          currentUserId={currentUserId}
          onNext={onNext}
          packFormat={packFormat}
        />
      );
    case "voting":
      return (
        <VotingBetweenBoard
          state={state}
          currentUserId={currentUserId}
          onNext={onNext}
        />
      );
    case "shared_grid":
      return (
        <BordaRevealBoard
          state={state}
          currentUserId={currentUserId}
          onNext={onNext}
        />
      );
    case "spy":
      return (
        <SpyBetweenBoard
          state={state}
          currentUserId={currentUserId}
          onNext={onNext}
        />
      );
    case "relay":
      return (
        <RelayBetweenBoard
          state={state}
          currentUserId={currentUserId}
          onNext={onNext}
        />
      );
    default:
      return null;
  }
}
