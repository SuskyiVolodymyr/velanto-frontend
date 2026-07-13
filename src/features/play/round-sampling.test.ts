import { describe, expect, it } from "vitest";
import { resolveRoundSelections } from "./round-sampling";
import type { Group, Round } from "@/src/shared/types/pack";

function textItem(id: string, title: string) {
  return { id, type: "text" as const, title, value: title };
}

function round(id: string, slots: Round["slots"]): Round {
  return { id, slots };
}

describe("resolveRoundSelections", () => {
  it("returns the pinned items in the author's chosen order for a manual slot", () => {
    const groups: Group[] = [
      {
        id: "g1",
        name: "Pool",
        items: [textItem("1", "A"), textItem("2", "B"), textItem("3", "C")],
      },
    ];
    const rounds = [
      round("r1", [{ groupId: "g1", mode: "manual", itemIds: ["3", "1"] }]),
    ];

    const result = resolveRoundSelections(groups, rounds);

    // Exactly the pinned items, in the pinned order (place 1 = item 3, etc.).
    expect(result[0].slots[0].items.map((i) => i.id)).toEqual(["3", "1"]);
  });

  it("draws exactly `count` unique items from the pool for a random slot", () => {
    const items = [
      textItem("1", "A"),
      textItem("2", "B"),
      textItem("3", "C"),
      textItem("4", "D"),
    ];
    const groups: Group[] = [{ id: "g1", name: "Pool", items }];
    const rounds = [round("r1", [{ groupId: "g1", mode: "random", count: 2 }])];

    const drawn = resolveRoundSelections(groups, rounds)[0].slots[0].items;

    expect(drawn).toHaveLength(2);
    expect(new Set(drawn.map((i) => i.id)).size).toBe(2);
    for (const item of drawn) expect(items).toContainEqual(item);
  });

  it("never repeats items across random slots that share a group (dedup)", () => {
    const items = [
      textItem("1", "A"),
      textItem("2", "B"),
      textItem("3", "C"),
      textItem("4", "D"),
    ];
    const groups: Group[] = [{ id: "g1", name: "Pool", items }];
    const rounds = [
      round("r1", [{ groupId: "g1", mode: "random", count: 2 }]),
      round("r2", [{ groupId: "g1", mode: "random", count: 2 }]),
    ];

    const result = resolveRoundSelections(groups, rounds);
    const first = result[0].slots[0].items.map((i) => i.id);
    const second = result[1].slots[0].items.map((i) => i.id);

    expect(first).toHaveLength(2);
    expect(second).toHaveLength(2);
    // Every item appears once across both rounds — no overlap.
    expect(new Set([...first, ...second]).size).toBe(4);
  });

  it("caps a random draw at the pool's remaining items", () => {
    const items = [textItem("1", "A"), textItem("2", "B"), textItem("3", "C")];
    const groups: Group[] = [{ id: "g1", name: "Pool", items }];
    const rounds = [
      round("r1", [{ groupId: "g1", mode: "random", count: 2 }]),
      round("r2", [{ groupId: "g1", mode: "random", count: 2 }]),
    ];

    const result = resolveRoundSelections(groups, rounds);

    // Round 1 consumes 2 of 3; round 2 can only draw the remaining 1.
    expect(result[0].slots[0].items).toHaveLength(2);
    expect(result[1].slots[0].items).toHaveLength(1);
  });

  it("reserves manual-pinned items so a random slot never draws them", () => {
    const items = [
      textItem("1", "A"),
      textItem("2", "B"),
      textItem("3", "C"),
      textItem("4", "D"),
    ];
    const groups: Group[] = [{ id: "g1", name: "Pool", items }];
    const rounds = [
      round("r1", [{ groupId: "g1", mode: "manual", itemIds: ["1"] }]),
      round("r2", [{ groupId: "g1", mode: "random", count: 4 }]),
    ];

    const result = resolveRoundSelections(groups, rounds);

    expect(result[0].slots[0].items.map((i) => i.id)).toEqual(["1"]);
    // The random round sees only the 3 unpinned items — never item 1.
    const drawn = result[1].slots[0].items.map((i) => i.id);
    expect(drawn).toHaveLength(3);
    expect(drawn).not.toContain("1");
  });

  it("draws each side of a two-slot (versus) round independently", () => {
    const groups: Group[] = [
      { id: "ca", name: "Boys", items: [textItem("1", "Naruto")] },
      { id: "cb", name: "Girls", items: [textItem("2", "Sakura")] },
    ];
    const rounds = [
      round("r1", [
        { groupId: "ca", mode: "random", count: 1 },
        { groupId: "cb", mode: "random", count: 1 },
      ]),
    ];

    const result = resolveRoundSelections(groups, rounds);

    expect(result[0].slots).toHaveLength(2);
    expect(result[0].slots[0].groupId).toBe("ca");
    expect(result[0].slots[1].groupId).toBe("cb");
  });
});
