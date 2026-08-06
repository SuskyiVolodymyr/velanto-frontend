"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { pageContainer } from "@/src/shared/lib/page-container";
import { cn } from "@/src/shared/lib/cn";
import { usePlayFocus } from "@/src/shared/lib/play-focus-context";
import { RoomHeader } from "@/src/features/friends-rooms/RoomHeader";
import { RoomBetweenBoard } from "@/src/features/friends-rooms/RoomBetweenBoard";
import { DesignLabBar } from "./DesignLabBar";
import { MOCK_VIEWER_ID, mockBetweenRoom } from "./mock-room";
import { useLabSelection } from "./use-lab-selection";

/**
 * The between-round screen, standing still.
 *
 * A faithful copy of the real room's own composition - RoomHeader, then
 * RoomScreen's page column, then the `phase === "between"` dispatcher - fed a
 * fabricated snapshot instead of a socket. Same components, so a change made
 * here IS the change to the product; nothing about the layout is re-drawn for
 * the lab.
 *
 * The switchers are the reason this page exists: seven modes across five
 * formats each draw their own between board, which in a real room means a
 * separate game per screen.
 */
export function DesignRoomBetweenScreen() {
  const router = useRouter();
  const { format, mode, switchers } = useLabSelection();
  // Rebuilt per selection - each between board reads a different result kind,
  // and the snapshot also re-stamps its auto-next deadline, so switching
  // restarts the countdown rather than showing a stale 0.
  const state = useMemo(
    () => mockBetweenRoom(mode, { format }),
    [mode, format],
  );

  // The real room drops the nav rail while a game is up. The lab does too, or
  // it would be judging the layout at a width no player ever sees.
  usePlayFocus(true);

  return (
    <>
      <DesignLabBar switchers={switchers} />
      <RoomHeader state={state} onLeave={() => router.push("/")} />
      <div
        className={cn(
          pageContainer(1320),
          "flex flex-1 flex-col gap-[22px] pt-[26px] pb-[60px] max-[720px]:pt-[18px] max-[720px]:pb-[168px]",
        )}
      >
        <RoomBetweenBoard
          state={state}
          currentUserId={MOCK_VIEWER_ID}
          packFormat={
            format === "save_one" || format === "sacrifice_one"
              ? format
              : undefined
          }
          onNext={() => {}}
        />
      </div>
    </>
  );
}
