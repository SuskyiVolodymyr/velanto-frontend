"use client";

import { useMemo, useState } from "react";
import { pageContainer } from "@/src/shared/lib/page-container";
import { cn } from "@/src/shared/lib/cn";
import { RoomResults } from "@/src/features/friends-rooms/RoomResults";
import { IdentityRevealScreen } from "@/src/features/friends-rooms/IdentityRevealScreen";
import { SpyRevealScreen } from "@/src/features/friends-rooms/SpyRevealScreen";
import { DesignLabBar } from "./DesignLabBar";
import { MOCK_SPY_USER_ID, MOCK_VIEWER_ID, mockResultsRoom } from "./mock-room";
import { useLabSelection } from "./use-lab-selection";

/**
 * The results screens - three genuinely different endings.
 *
 * The five shared-verdict modes fall to the round-by-round summary; Guess-who
 * names every anonymous column and grades your mapping; Spy names the spy,
 * grades your accusation, and publishes what the spy could actually see each
 * round, which was withheld for the whole game.
 *
 * Deliberately NOT play-focused: unlike a round, a results screen is a page you
 * have finished with and want to navigate away from, and the real room brings
 * its nav rail back here for exactly that reason. The lab keeps the rail so it
 * is judged the way it ships.
 */
export function DesignRoomResultsScreen() {
  const [asSpy, setAsSpy] = useState(false);
  const { format, mode, switchers } = useLabSelection();
  const state = useMemo(
    () => mockResultsRoom(mode, { format, asSpy }),
    [mode, format, asSpy],
  );

  // After the reveal the role is public, so SpyRevealScreen reads who is
  // looking from the viewer id rather than from a per-viewer flag - seeing the
  // spy's own copy means BEING them.
  const viewerId = mode === "spy" && asSpy ? MOCK_SPY_USER_ID : MOCK_VIEWER_ID;

  return (
    <>
      <DesignLabBar
        switchers={[
          ...switchers,
          // Only Spy has a second point of view. Guess-who's endgame looks
          // the same to everyone, so offering the toggle there would be a
          // control that changes nothing.
          ...(mode === "spy"
            ? [
                {
                  label: "Viewer",
                  options: [
                    { value: "accuser", label: "Accuser" },
                    { value: "spy", label: "Spy" },
                  ],
                  value: asSpy ? "spy" : "accuser",
                  onChange: (value: string) => setAsSpy(value === "spy"),
                },
              ]
            : []),
        ]}
      />
      {/* The real room drops its header on a finished game - every reveal
          screen heads itself with the pack title and its own way out. Kept off
          here for the same reason, or the lab would be judging chrome the
          product does not draw. */}
      <div
        className={cn(
          pageContainer(1320),
          "flex flex-1 flex-col gap-[22px] pt-[26px] pb-[60px] max-[720px]:pt-[18px] max-[720px]:pb-[168px]",
        )}
      >
        {mode === "guess_who" ? (
          <IdentityRevealScreen state={state} currentUserId={viewerId} />
        ) : mode === "spy" ? (
          <SpyRevealScreen state={state} currentUserId={viewerId} />
        ) : (
          <RoomResults
            state={state}
            currentUserId={viewerId}
            packFormat={
              format === "save_one" || format === "sacrifice_one"
                ? format
                : undefined
            }
          />
        )}
      </div>
    </>
  );
}
