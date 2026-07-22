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

  // Was: an unnamed elimination round borrowed its pool's name. Dropped in
  // #355 — see the new cases at the bottom. A blank/whitespace name is still
  // treated as absent, which is what round 2 checks here.
  it("treats a blank round name as absent", () => {
    expect(roundHeading(pack({}), 1)).toBe("Round 2");
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

  // #355: the pool-name fallback is gone. A random-pool round has no pool name
  // to borrow at authoring time, and half a pack's rounds named after their
  // pool while the other half were numbered read as a bug.
  it("numbers an unnamed round rather than borrowing its pool's name", () => {
    expect(roundHeading(pack({}), 0)).toBe("Round 1");
  });

  it("still prefers the author's own round name", () => {
    expect(
      roundHeading(
        pack({
          rounds: [
            round({ id: "r1", name: "Semifinals", slots: [slot("g1")] }),
          ],
        }),
        0,
      ),
    ).toBe("Semifinals");
  });

  it("numbers a round whose pool is drawn at play time", () => {
    expect(
      roundHeading(
        pack({
          rounds: [
            round({
              id: "r1",
              slots: [{ groupMode: "random", mode: "random", count: 2 }],
            }),
          ],
        }),
        0,
      ),
    ).toBe("Round 1");
  });
});
