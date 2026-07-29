"use client";

import type { Pack } from "@/src/shared/types/pack";
import type { RoomState } from "./room-types";
import { RoomBetween } from "./RoomBetween";
import { GuessWhoRevealBoard } from "./GuessWhoRevealBoard";

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
    // Every other mode's between-round block is added by that mode's task
    // group (Tasks 19/22/24/26) — each reuses this same shell, since "show
    // this round's outcome + wait for everyone to press Next" is identical
    // lobby-side chrome across every mode; only the outcome BLOCK differs.
    default:
      return null;
  }
}
