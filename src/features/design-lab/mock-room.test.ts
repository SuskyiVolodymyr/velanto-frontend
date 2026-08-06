import { describe, expect, it } from "vitest";
import { ROOM_MODE_BOUNDS } from "@/src/features/friends-rooms/room-types";
import { MODES_1V1, mock1v1BetweenRoom } from "./mock-room";

/**
 * The lab is worth nothing if its fixture is not a room the real screens would
 * accept. These pin the two things a between-round board silently returns
 * `null` on — which in the lab reads as a blank page with no error to chase.
 */
describe("mock1v1BetweenRoom", () => {
  it("offers exactly the modes a 1v1 pack can run", () => {
    const eligible = Object.entries(ROOM_MODE_BOUNDS)
      .filter(([, bounds]) => bounds.formats.includes("1v1"))
      .map(([mode]) => mode)
      .sort();

    expect([...MODES_1V1].sort()).toEqual(eligible);
  });

  it.each(MODES_1V1)(
    "gives %s a closed result for the round it is sitting on",
    (mode) => {
      const state = mock1v1BetweenRoom(mode);
      // Every between board looks its own result up by `round.index` and
      // renders nothing when it is absent.
      expect(state.round).not.toBeNull();
      expect(state.results.some((r) => r.index === state.round!.index)).toBe(
        true,
      );
    },
  );

  it.each(MODES_1V1)("keeps %s on the 1v1 two-option shape", (mode) => {
    const state = mock1v1BetweenRoom(mode);

    expect(state.packFormat).toBe("1v1");
    expect(state.round?.items).toHaveLength(2);
    // No `sides`: those are nxn's pools. A 1v1 option IS an item, and a board
    // handed sides here would take the wrong branch entirely.
    expect(state.round?.sides).toBeUndefined();
  });
});
