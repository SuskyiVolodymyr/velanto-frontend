"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { pageContainer } from "@/src/shared/lib/page-container";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import { usePlayFocus } from "@/src/shared/lib/play-focus-context";
import { RoomHeader } from "@/src/features/friends-rooms/RoomHeader";
import { GuessingPhaseScreen } from "@/src/features/friends-rooms/GuessingPhaseScreen";
import { SpyAccusationScreen } from "@/src/features/friends-rooms/SpyAccusationScreen";
import { DesignLabBar } from "./DesignLabBar";
import { MOCK_VIEWER_ID, mockGuessingRoom } from "./mock-room";
import { useLabSelection } from "./use-lab-selection";

/**
 * The endgame - the screen where the room stops picking clips and starts
 * naming people.
 *
 * Only two modes reach it: Guess-who assigns every anonymous label to a real
 * player, Spy asks for one accusation. They are different components on the
 * same `guessing` phase, and the mode switcher is what makes them comparable
 * without playing two full games.
 *
 * The fixture plays all five rounds first, with a deliberate pattern in who
 * picked what (see PICK_SEED) - this screen is READ off that history, so a
 * mock with random picks would make the layout look finished while the thing
 * it exists for was missing.
 */
export function DesignRoomGuessingScreen() {
  const router = useRouter();
  const [asSpy, setAsSpy] = useState(false);
  const { format, mode, switchers } = useLabSelection("1v1", true);
  const state = useMemo(
    () => mockGuessingRoom(mode, { format, asSpy }),
    [mode, format, asSpy],
  );

  usePlayFocus(true);

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
      <RoomHeader state={state} onLeave={() => router.push("/")} />
      <div
        className={cn(
          pageContainer(1320),
          "flex flex-1 flex-col gap-[22px] pt-[26px] pb-[60px] max-[720px]:pt-[18px] max-[720px]:pb-[168px]",
        )}
      >
        {/* The real room's own visually-hidden h1 for this phase - neither
            endgame screen heads itself, and dropping it here would let the lab
            pass an accessibility check the product would fail. */}
        <Text as="h1" className="sr-only">
          {state.packTitle}
        </Text>
        {mode === "spy" ? (
          <SpyAccusationScreen
            state={state}
            currentUserId={MOCK_VIEWER_ID}
            onAccuse={() => {}}
          />
        ) : (
          <GuessingPhaseScreen
            state={state}
            currentUserId={MOCK_VIEWER_ID}
            onSubmit={() => {}}
          />
        )}
      </div>
    </>
  );
}
