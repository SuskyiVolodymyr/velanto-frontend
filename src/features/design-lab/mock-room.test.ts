import { describe, expect, it } from "vitest";
import { ROOM_MODE_BOUNDS } from "@/src/features/friends-rooms/room-types";
import type { RoomMode } from "@/src/features/friends-rooms/room-types";
import {
  LAB_FORMATS,
  labModes,
  mockBetweenRoom,
  mockResultsRoom,
} from "./mock-room";
import type { LabFormat } from "./mock-room";

/**
 * The lab is worth nothing if its fixture is not a room the real screens would
 * accept. These pin the things a board silently returns `null` on — which in
 * the lab reads as a blank page with no error to chase.
 */

/** Every (format, mode) the room model actually allows. */
const COMBINATIONS: [LabFormat, RoomMode][] = LAB_FORMATS.flatMap((format) =>
  labModes(format).map((mode): [LabFormat, RoomMode] => [format, mode]),
);

describe("lab fixture", () => {
  it("covers every mode the room model has", () => {
    const covered = new Set(COMBINATIONS.map(([, mode]) => mode));

    expect([...covered].sort()).toEqual(
      (Object.keys(ROOM_MODE_BOUNDS) as RoomMode[]).sort(),
    );
  });

  it.each(COMBINATIONS)(
    "%s / %s sits on a round its results can name",
    (format, mode) => {
      const state = mockBetweenRoom(mode, { format });

      expect(state.round).not.toBeNull();
      // Every between board looks its own result up by `round.index` and
      // renders nothing when it is absent.
      expect(
        state.results.some((result) => result.index === state.round?.index),
      ).toBe(true);
    },
  );

  it.each(COMBINATIONS)("%s / %s resolves a full game", (format, mode) => {
    const state = mockResultsRoom(mode, { format });

    expect(state.phase).toBe("finished");
    expect(state.results).toHaveLength(state.totalRounds);
  });

  it.each(labModes("nxn"))("gives %s two named pools on nxn", (mode) => {
    const state = mockBetweenRoom(mode, { format: "nxn" });

    expect(state.round?.sides).toHaveLength(2);
    // An option is a POOL here, so `optionIds` must be the side ids and not
    // item ids — the single difference every nxn arm keys off.
    expect(state.round?.optionIds).toEqual(
      state.round?.sides?.map((side) => side.id),
    );
    // More than one item per side, or the arm being designed renders exactly
    // like a 1v1 contender and proves nothing.
    for (const side of state.round?.sides ?? []) {
      expect(side.itemIds.length).toBeGreaterThan(1);
    }
  });

  it.each(labModes("1v1"))("keeps %s on the 1v1 two-option shape", (mode) => {
    const state = mockBetweenRoom(mode, { format: "1v1" });

    expect(state.round?.items).toHaveLength(2);
    // No `sides`: those are nxn's pools. A 1v1 option IS an item, and a board
    // handed sides here would take the wrong branch entirely — which is what
    // an empty-but-present array would cause.
    expect(state.round?.sides).toBeUndefined();
  });

  it("leaves exactly one item unclaimed on a Claim round", () => {
    // Claim's whole mechanic: the item nobody grabbed is the one that
    // survives. Colliding claims would leave the round with no survivor and
    // the between screen with nothing to render.
    const state = mockBetweenRoom("claim", { format: "sacrifice_one" });
    const claimed = Object.values(state.round?.claims ?? {});

    expect(new Set(claimed).size).toBe(claimed.length);
    expect(state.round?.survivorItemId).toBeTruthy();
    expect(claimed).not.toContain(state.round?.survivorItemId);
  });

  it("gives every player a different ranking on a ranked round", () => {
    // Shared-grid aggregates ballots and Guess-who compares them; identical
    // orderings would make both screens look right while showing nothing.
    const state = mockResultsRoom("shared_grid", { format: "rank_blind" });
    const round = state.results[0];
    if (round.kind !== "borda") throw new Error("expected a borda round");
    const ballots = Object.values(round.ballots).map((b) => b.join(","));

    expect(new Set(ballots).size).toBeGreaterThan(1);
  });
});
