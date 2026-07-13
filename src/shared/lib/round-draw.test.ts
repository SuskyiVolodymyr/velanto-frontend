import { describe, it, expect } from "vitest";
import { resolveRoundDraws } from "@/src/shared/lib/round-draw";

// Mirrors velanto-backend src/modules/packs/round-draw.spec.ts — the two engines
// must agree (cross-repo-drift can't snapshot logic, so keep these in lockstep).
function group(id: string, itemCount: number) {
  return {
    id,
    items: Array.from({ length: itemCount }, (_, i) => ({ id: `${id}-${i}` })),
  };
}

describe("resolveRoundDraws", () => {
  it("draws min(count, group size) for a random slot", () => {
    const resolved = resolveRoundDraws(
      [group("g", 5)],
      [{ slots: [{ groupId: "g", mode: "random", count: 3 }] }],
    );
    expect(resolved[0].slots[0].drawnCount).toBe(3);
  });

  it("caps a random draw at the group size", () => {
    const resolved = resolveRoundDraws(
      [group("g", 2)],
      [{ slots: [{ groupId: "g", mode: "random", count: 5 }] }],
    );
    expect(resolved[0].slots[0].drawnCount).toBe(2);
  });

  it("draws exactly the pinned items for a manual slot", () => {
    const resolved = resolveRoundDraws(
      [group("g", 5)],
      [{ slots: [{ groupId: "g", mode: "manual", itemIds: ["g-0", "g-2"] }] }],
    );
    expect(resolved[0].slots[0].drawnCount).toBe(2);
  });

  it("reserves manual-pinned items so a random slot cannot draw them", () => {
    const resolved = resolveRoundDraws(
      [group("g", 4)],
      [
        { slots: [{ groupId: "g", mode: "random", count: 4 }] },
        { slots: [{ groupId: "g", mode: "manual", itemIds: ["g-0"] }] },
      ],
    );
    expect(resolved[0].slots[0].drawnCount).toBe(3);
    expect(resolved[1].slots[0].drawnCount).toBe(1);
  });

  it("random slots dedup among themselves after manual reservation", () => {
    const resolved = resolveRoundDraws(
      [group("g", 5)],
      [
        { slots: [{ groupId: "g", mode: "manual", itemIds: ["g-0"] }] },
        { slots: [{ groupId: "g", mode: "random", count: 3 }] },
        { slots: [{ groupId: "g", mode: "random", count: 3 }] },
      ],
    );
    expect(resolved[0].slots[0].drawnCount).toBe(1);
    expect(resolved[1].slots[0].drawnCount).toBe(3);
    expect(resolved[2].slots[0].drawnCount).toBe(1);
  });

  it("never repeats items across random rounds sharing a group (dedup)", () => {
    const resolved = resolveRoundDraws(
      [group("g", 3)],
      [
        { slots: [{ groupId: "g", mode: "random", count: 2 }] },
        { slots: [{ groupId: "g", mode: "random", count: 2 }] },
      ],
    );
    expect(resolved[0].slots[0].drawnCount).toBe(2);
    expect(resolved[1].slots[0].drawnCount).toBe(1);
  });

  it("yields 0 when an earlier round has exhausted the group", () => {
    const resolved = resolveRoundDraws(
      [group("g", 2)],
      [
        { slots: [{ groupId: "g", mode: "random", count: 2 }] },
        { slots: [{ groupId: "g", mode: "random", count: 2 }] },
      ],
    );
    expect(resolved[1].slots[0].drawnCount).toBe(0);
  });

  it("tracks each group independently in versus rounds", () => {
    const resolved = resolveRoundDraws(
      [group("a", 2), group("b", 2)],
      [
        {
          slots: [
            { groupId: "a", mode: "random", count: 1 },
            { groupId: "b", mode: "random", count: 1 },
          ],
        },
        {
          slots: [
            { groupId: "a", mode: "random", count: 1 },
            { groupId: "b", mode: "random", count: 1 },
          ],
        },
      ],
    );
    expect(resolved[1].slots[0].drawnCount).toBe(1);
    expect(resolved[1].slots[1].drawnCount).toBe(1);
  });

  it("resolves an unknown groupId to a 0 draw", () => {
    const resolved = resolveRoundDraws(
      [group("g", 2)],
      [{ slots: [{ groupId: "ghost", mode: "random", count: 2 }] }],
    );
    expect(resolved[0].slots[0].drawnCount).toBe(0);
  });
});
