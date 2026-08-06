"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { pageContainer } from "@/src/shared/lib/page-container";
import { cn } from "@/src/shared/lib/cn";
import { usePlayFocus } from "@/src/shared/lib/play-focus-context";
import { RoomHeader } from "@/src/features/friends-rooms/RoomHeader";
import { RoomBetweenBoard } from "@/src/features/friends-rooms/RoomBetweenBoard";
import { DesignLabBar } from "./DesignLabBar";
import { MODES_1V1, MOCK_VIEWER_ID, mock1v1BetweenRoom } from "./mock-room";
import type { Mode1v1 } from "./mock-room";

/** English-only, like the rest of the lab — see DesignLabBar. */
const MODE_LABEL: Record<Mode1v1, string> = {
  voting: "Voting",
  guess_who: "Guess-who",
  spy: "Spy",
};

/**
 * The 1v1 between-round screen, standing still.
 *
 * A faithful copy of the real room's own composition — RoomHeader, then
 * RoomScreen's page column, then the `phase === "between"` dispatcher — fed a
 * fabricated snapshot instead of a socket. Same components, so a change made
 * here IS the change to the product; nothing about the layout is re-drawn for
 * the lab.
 *
 * The mode switcher is the reason this page exists: 1v1 runs under three modes
 * and each draws its own between board, which in a real room means three
 * separate games to see three screens.
 */
export function DesignRoomBetweenScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode1v1>("voting");
  // Rebuilt per mode — each between board reads a different result kind, and
  // the snapshot also re-stamps its auto-next deadline, so switching restarts
  // the countdown rather than showing a stale 0.
  const state = useMemo(() => mock1v1BetweenRoom(mode), [mode]);

  // The real room drops the nav rail while a game is up. The lab does too, or
  // it would be judging the layout at a width no player ever sees.
  usePlayFocus(true);

  return (
    <>
      <DesignLabBar
        title="Room · between rounds · 1v1"
        switcherLabel="Mode"
        options={MODES_1V1.map((m) => ({ value: m, label: MODE_LABEL[m] }))}
        value={mode}
        onChange={setMode}
      />
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
          onNext={() => {}}
        />
      </div>
    </>
  );
}
