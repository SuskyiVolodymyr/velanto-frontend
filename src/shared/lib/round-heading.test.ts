import { describe, expect, it } from "vitest";
import type { Pack, Round, Slot } from "@/src/shared/types/pack";
import { roundHeading } from "@/src/shared/lib/round-heading";

const slot = (groupId: string): Slot => ({ groupId, mode: "random", count: 1 });
const round = (over: Partial<Round> & Pick<Round, "id" | "slots">): Round =>
  over;

function pack(over: Partial<Pack>): Pack {
  return {
    format: "rank_blind",
    groups: [
      { id: "g1", name: "Openings", items: [] },
      { id: "g2", name: "Endings", items: [] },
    ],
    rounds: [
      round({ id: "r1", slots: [slot("g1")] }),
      round({ id: "r2", name: "  ", slots: [slot("g2")] }),
    ],
    ...over,
  } as Pack;
}

describe("roundHeading", () => {
  it("uses the author-given round name when set", () => {
    const p = pack({
      rounds: [round({ id: "r1", name: "Semifinals", slots: [slot("g1")] })],
    });
    expect(roundHeading(p, 0)).toBe("Semifinals");
  });

  it("falls back to the round's pool name for an elimination format", () => {
    // rank_blind round with no author name → the pool it draws from.
    expect(roundHeading(pack({}), 0)).toBe("Openings");
    // A blank/whitespace name is treated as absent.
    expect(roundHeading(pack({}), 1)).toBe("Endings");
  });

  it("falls back to 'Round N' for a versus format (two pools, no single name)", () => {
    const p = pack({
      format: "nxn",
      rounds: [round({ id: "r1", slots: [slot("g1"), slot("g2")] })],
    });
    expect(roundHeading(p, 0)).toBe("Round 1");
  });

  it("falls back to 'Round N' when the pool can't be resolved", () => {
    const p = pack({
      groups: [],
      rounds: [round({ id: "r1", slots: [slot("missing")] })],
    });
    expect(roundHeading(p, 0)).toBe("Round 1");
  });
});
