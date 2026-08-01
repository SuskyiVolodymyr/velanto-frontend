import { describe, expect, it } from "vitest";
import { packStructureHash } from "./pack-structure-hash";
import type { Group, Round } from "@/src/shared/types/pack";

function textItem(id: string, title: string, value = title) {
  return { id, type: "text" as const, title, value };
}

const groups: Group[] = [
  { id: "g1", name: "Pool A", items: [textItem("1", "A"), textItem("2", "B")] },
];
const rounds: Round[] = [
  {
    id: "r1",
    name: "Round one",
    slots: [{ groupId: "g1", mode: "random", count: 1 }],
  },
];

describe("packStructureHash", () => {
  it("is stable: same structure hashes to the same string", () => {
    expect(packStructureHash({ groups, rounds })).toBe(
      packStructureHash({ groups, rounds }),
    );
  });

  it("returns a non-empty string", () => {
    expect(packStructureHash({ groups, rounds })).toBeTypeOf("string");
    expect(packStructureHash({ groups, rounds }).length).toBeGreaterThan(0);
  });

  it("changes when an item's content changes (player would see a different card)", () => {
    const edited: Group[] = [
      { ...groups[0], items: [textItem("1", "A"), textItem("2", "CHANGED")] },
    ];
    expect(packStructureHash({ groups: edited, rounds })).not.toBe(
      packStructureHash({ groups, rounds }),
    );
  });

  it("changes when a slot's draw parameters change", () => {
    const edited: Round[] = [
      { ...rounds[0], slots: [{ groupId: "g1", mode: "random", count: 2 }] },
    ];
    expect(packStructureHash({ groups, rounds: edited })).not.toBe(
      packStructureHash({ groups, rounds }),
    );
  });

  it("changes when an item is added to a pool", () => {
    const edited: Group[] = [
      { ...groups[0], items: [...groups[0].items, textItem("3", "C")] },
    ];
    expect(packStructureHash({ groups: edited, rounds })).not.toBe(
      packStructureHash({ groups, rounds }),
    );
  });

  it("ignores cosmetic labels that don't affect the draw or the cards (round/pool names)", () => {
    const renamedRound: Round[] = [{ ...rounds[0], name: "Totally new name" }];
    const renamedGroup: Group[] = [{ ...groups[0], name: "Renamed pool" }];
    expect(packStructureHash({ groups, rounds: renamedRound })).toBe(
      packStructureHash({ groups, rounds }),
    );
    expect(packStructureHash({ groups: renamedGroup, rounds })).toBe(
      packStructureHash({ groups, rounds }),
    );
  });
});
