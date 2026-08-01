import { describe, expect, it } from "vitest";
import { roundResultFromResolved } from "./round-resolved";
import type { Item } from "@/src/shared/types/pack";

const ITEMS: Item[] = [
  { id: "a", type: "text", title: "A", value: "A" },
  { id: "b", type: "text", title: "B", value: "B" },
];
const ROUND = { index: 2, name: "Round three", items: ITEMS };

/**
 * `round.resolved` is ONE event name carrying FIVE payload shapes, with no
 * `kind` on the wire. These lock in that each mode's payload becomes its own
 * result kind — the bug this replaced synthesized `kind: "survivor"` for all
 * five, so every non-Claim between-round board found no result of its own kind
 * and rendered a blank screen.
 */
describe("roundResultFromResolved", () => {
  it("claim -> a survivor result carrying the round's own name and items", () => {
    expect(
      roundResultFromResolved("claim", ROUND, {
        index: 2,
        autoNextAt: null,
        survivorItemId: "a",
        claims: { u1: "b" },
      }),
    ).toEqual({
      kind: "survivor",
      index: 2,
      name: "Round three",
      items: ITEMS,
      claims: { u1: "b" },
      survivorItemId: "a",
      cuts: undefined,
    });
  });

  it("turn_based_cut -> a survivor result that KEEPS the cut history", () => {
    const cuts = [{ userId: "u1", itemId: "b" }];
    const result = roundResultFromResolved("turn_based_cut", ROUND, {
      index: 2,
      autoNextAt: null,
      survivorItemId: "a",
      claims: {},
      cuts,
    });
    expect(result).toMatchObject({ kind: "survivor", cuts });
  });

  it("guess_who -> a reveal result", () => {
    expect(
      roundResultFromResolved("guess_who", ROUND, {
        index: 2,
        autoNextAt: null,
        picks: { A: ["a"], B: ["b"] },
      }),
    ).toMatchObject({ kind: "reveal", picks: { A: ["a"], B: ["b"] } });
  });

  // On an nxn round a pick names a POOL, so the reveal has to carry what those
  // pools ARE or nothing downstream can name a choice. The event doesn't ship
  // them and doesn't need to: the client already holds the board — the same
  // reason `name` and `items` come from the round rather than the payload.
  // Without this the live guessing-phase table printed raw group ids all game,
  // while the results screen (rebuilt server-side from the pack) read fine.
  it("carries the round's nxn sides onto a reveal result", () => {
    const sides = [
      { id: "ca", name: "Side A", itemIds: ["a"] },
      { id: "cb", name: "Side B", itemIds: ["b"] },
    ];
    expect(
      roundResultFromResolved(
        "guess_who",
        { ...ROUND, sides },
        { index: 2, autoNextAt: null, picks: { A: ["ca"], B: ["cb"] } },
      ),
    ).toMatchObject({ kind: "reveal", sides });
  });

  it("leaves sides off a reveal for a format that has none", () => {
    const result = roundResultFromResolved("guess_who", ROUND, {
      index: 2,
      autoNextAt: null,
      picks: { A: ["a"] },
    });
    expect(result && "sides" in result && result.sides).toBeFalsy();
  });

  it("voting -> a vote result with its tally and tie-break fields", () => {
    expect(
      roundResultFromResolved("voting", ROUND, {
        index: 2,
        autoNextAt: null,
        optionIds: ["a", "b"],
        votes: { u1: "a", u2: "b" },
        tally: { a: 1, b: 1 },
        winnerOptionId: "a",
        tieBroken: true,
        priorityUserId: "u1",
      }),
    ).toMatchObject({
      kind: "vote",
      winnerOptionId: "a",
      tieBroken: true,
      priorityUserId: "u1",
      tally: { a: 1, b: 1 },
    });
  });

  it("shared_grid -> a borda result whose order stays TIERED", () => {
    const result = roundResultFromResolved("shared_grid", ROUND, {
      index: 2,
      autoNextAt: null,
      scores: { a: 3, b: 3 },
      order: [["a", "b"]],
      ballots: { u1: ["a", "b"] },
    });
    expect(result).toMatchObject({ kind: "borda", order: [["a", "b"]] });
  });

  it("relay -> a relay result whose order stays FLAT", () => {
    const result = roundResultFromResolved("relay", ROUND, {
      index: 2,
      autoNextAt: null,
      order: ["b", "a"],
      placements: [{ userId: "u1", itemId: "b" }],
    });
    expect(result).toMatchObject({
      kind: "relay",
      order: ["b", "a"],
      placements: [{ userId: "u1", itemId: "b" }],
    });
  });

  it("returns null rather than fabricating a result when the mode is unknown", () => {
    expect(
      roundResultFromResolved(null, ROUND, {
        index: 2,
        autoNextAt: null,
        survivorItemId: "a",
      }),
    ).toBeNull();
  });

  it("returns null when the payload is missing the field its kind is defined by", () => {
    // A claim payload with no survivor is not a survivor round. Returning a
    // half-built one is what produced `survivorItemId: undefined` and the
    // `Object.entries(undefined)` throw in RoomResults.
    expect(
      roundResultFromResolved("claim", ROUND, { index: 2, autoNextAt: null }),
    ).toBeNull();
    expect(
      roundResultFromResolved("voting", ROUND, { index: 2, autoNextAt: null }),
    ).toBeNull();
  });
});
