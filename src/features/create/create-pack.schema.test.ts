import { describe, it, expect } from "vitest";
import {
  createPackSchema,
  type CreatePackValues,
  TITLE_MAX,
  DESCRIPTION_MAX,
  ELIMINATION_MAX_DRAW,
  NXN_SIDE_COUNT_MAX,
} from "./create-pack.schema";
import type { Item } from "@/src/shared/types/pack";

function textItem(title: string): Item {
  return { id: `i-${title}`, type: "text", title, value: title };
}

// A base elimination draft: one pool of 2 items, one round drawing both.
function makeValues(
  overrides: Partial<CreatePackValues> = {},
): CreatePackValues {
  return {
    title: "My pack",
    description: "A short description.",
    coverTone: "#2b2a3a",
    language: "en",
    format: "save_one",
    tags: [],
    groups: [
      { id: "g1", name: "Openings", items: [textItem("a"), textItem("b")] },
    ],
    rounds: [
      { id: "r1", slots: [{ groupId: "g1", mode: "random", count: 2 }] },
    ],
    ...overrides,
  };
}

// A base versus draft: two distinct pools, one 2-slot round.
function versusValues(
  overrides: Partial<CreatePackValues> = {},
): CreatePackValues {
  return makeValues({
    format: "nxn",
    groups: [
      {
        id: "boys",
        name: "Boys",
        items: [textItem("Naruto"), textItem("Sasuke")],
      },
      {
        id: "girls",
        name: "Girls",
        items: [textItem("Sakura"), textItem("Hinata")],
      },
    ],
    rounds: [
      {
        id: "r1",
        slots: [
          { groupId: "boys", mode: "random", count: 1 },
          { groupId: "girls", mode: "random", count: 1 },
        ],
      },
    ],
    ...overrides,
  });
}

function messageAt(values: CreatePackValues, path: string): string | undefined {
  const result = createPackSchema.safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path.join(".") === path)
    ?.message;
}

function isValid(values: CreatePackValues): boolean {
  return createPackSchema.safeParse(values).success;
}

describe("createPackSchema — common fields", () => {
  it("accepts a minimal valid save_one pack", () => {
    expect(isValid(makeValues())).toBe(true);
  });

  it("rejects a blank title", () => {
    expect(messageAt(makeValues({ title: "   " }), "title")).toBe(
      "Give your pack a title.",
    );
  });

  it("rejects an over-long title", () => {
    expect(
      messageAt(makeValues({ title: "a".repeat(TITLE_MAX + 1) }), "title"),
    ).toBe(`Title must be ${TITLE_MAX} characters or fewer.`);
  });

  it("rejects a blank description", () => {
    expect(messageAt(makeValues({ description: "  " }), "description")).toBe(
      "Add a short description.",
    );
  });

  it("rejects an over-long description", () => {
    expect(
      messageAt(
        makeValues({ description: "a".repeat(DESCRIPTION_MAX + 1) }),
        "description",
      ),
    ).toBe(`Description must be ${DESCRIPTION_MAX} characters or fewer.`);
  });

  it("trims title and description in the parsed output", () => {
    const result = createPackSchema.safeParse(
      makeValues({ title: "  hi  ", description: "  yo  " }),
    );
    expect(result.success && result.data.title).toBe("hi");
    expect(result.success && result.data.description).toBe("yo");
  });

  it("rejects more than the maximum number of tags", () => {
    const tooMany = Array.from(
      { length: 11 },
      () => "Anime",
    ) as CreatePackValues["tags"];
    expect(messageAt(makeValues({ tags: tooMany }), "tags")).toBe(
      "Choose at most 10 tags.",
    );
  });
});

describe("createPackSchema — elimination (save_one / sacrifice_one / rank_blind)", () => {
  for (const format of ["save_one", "sacrifice_one", "rank_blind"] as const) {
    it(`accepts a valid ${format} pack`, () => {
      expect(isValid(makeValues({ format }))).toBe(true);
    });
  }

  it("accepts a manual round that pins specific items", () => {
    expect(
      isValid(
        makeValues({
          rounds: [
            {
              id: "r1",
              slots: [
                { groupId: "g1", mode: "manual", itemIds: ["i-a", "i-b"] },
              ],
            },
          ],
        }),
      ),
    ).toBe(true);
  });

  it("rejects a manual round pinning a single item (below the min-draw)", () => {
    expect(
      isValid(
        makeValues({
          rounds: [
            {
              id: "r1",
              slots: [{ groupId: "g1", mode: "manual", itemIds: ["i-a"] }],
            },
          ],
        }),
      ),
    ).toBe(false);
  });

  it("rejects a manual round pinning an item that is not in the group", () => {
    expect(
      isValid(
        makeValues({
          rounds: [
            {
              id: "r1",
              slots: [
                { groupId: "g1", mode: "manual", itemIds: ["i-a", "ghost"] },
              ],
            },
          ],
        }),
      ),
    ).toBe(false);
  });

  it("rejects the same item pinned in two manual rounds of one group", () => {
    const fourItemGroup = {
      id: "g1",
      name: "Openings",
      items: [textItem("a"), textItem("b"), textItem("c"), textItem("d")],
    };
    expect(
      isValid(
        makeValues({
          groups: [fourItemGroup],
          rounds: [
            {
              id: "r1",
              slots: [
                { groupId: "g1", mode: "manual", itemIds: ["i-a", "i-b"] },
              ],
            },
            {
              id: "r2",
              slots: [
                { groupId: "g1", mode: "manual", itemIds: ["i-b", "i-c"] },
              ],
            },
          ],
        }),
      ),
    ).toBe(false);
  });

  it("accepts a manual round reserving items alongside a still-feasible random round on the same group", () => {
    const fourItemGroup = {
      id: "g1",
      name: "Openings",
      items: [textItem("a"), textItem("b"), textItem("c"), textItem("d")],
    };
    expect(
      isValid(
        makeValues({
          groups: [fourItemGroup],
          rounds: [
            {
              id: "r1",
              slots: [
                { groupId: "g1", mode: "manual", itemIds: ["i-a", "i-b"] },
              ],
            },
            // 2 items reserved by the manual round, 2 left → random draw of 2 fits.
            { id: "r2", slots: [{ groupId: "g1", mode: "random", count: 2 }] },
          ],
        }),
      ),
    ).toBe(true);
  });

  it("rejects a random round left with nothing after a manual round reserved the whole pool", () => {
    expect(
      isValid(
        makeValues({
          // g1 has 2 items; the manual round pins both, so the random round
          // would draw 0 — a hard feasibility error.
          rounds: [
            {
              id: "r1",
              slots: [
                { groupId: "g1", mode: "manual", itemIds: ["i-a", "i-b"] },
              ],
            },
            { id: "r2", slots: [{ groupId: "g1", mode: "random", count: 2 }] },
          ],
        }),
      ),
    ).toBe(false);
  });

  it("rejects a group with no name", () => {
    expect(
      messageAt(
        makeValues({
          groups: [
            { id: "g1", name: " ", items: [textItem("a"), textItem("b")] },
          ],
        }),
        "groups.0.name",
      ),
    ).toBe("Every group needs a name.");
  });

  it("rejects a group with no items", () => {
    expect(
      messageAt(
        makeValues({ groups: [{ id: "g1", name: "R1", items: [] }] }),
        "groups.0.items",
      ),
    ).toBe('Group "R1" needs at least one item.');
  });

  it("rejects a round drawing fewer than 2 items", () => {
    expect(
      messageAt(
        makeValues({
          rounds: [
            { id: "r1", slots: [{ groupId: "g1", mode: "random", count: 1 }] },
          ],
        }),
        "rounds.0.slots.0",
      ),
    ).toBe("Each round must show at least 2 items.");
  });

  it("rejects a round drawing more than the max items", () => {
    expect(
      messageAt(
        makeValues({
          rounds: [
            {
              id: "r1",
              slots: [
                {
                  groupId: "g1",
                  mode: "random",
                  count: ELIMINATION_MAX_DRAW + 1,
                },
              ],
            },
          ],
        }),
        "rounds.0.slots.0",
      ),
    ).toBe(`Each round must show at most ${ELIMINATION_MAX_DRAW} items.`);
  });

  it("accepts a round drawing exactly the max items", () => {
    expect(
      isValid(
        makeValues({
          rounds: [
            {
              id: "r1",
              slots: [
                { groupId: "g1", mode: "random", count: ELIMINATION_MAX_DRAW },
              ],
            },
          ],
        }),
      ),
    ).toBe(true);
  });

  it("rejects a manual round pinning more than the max items", () => {
    const nineItems = Array.from({ length: ELIMINATION_MAX_DRAW + 1 }, (_, i) =>
      textItem(`m${i}`),
    );
    expect(
      isValid(
        makeValues({
          groups: [{ id: "g1", name: "Openings", items: nineItems }],
          rounds: [
            {
              id: "r1",
              slots: [
                {
                  groupId: "g1",
                  mode: "manual",
                  itemIds: nineItems.map((it) => it.id),
                },
              ],
            },
          ],
        }),
      ),
    ).toBe(false);
  });

  it("rejects a round whose slot references an unknown group", () => {
    expect(
      messageAt(
        makeValues({
          rounds: [
            {
              id: "r1",
              slots: [{ groupId: "ghost", mode: "random", count: 2 }],
            },
          ],
        }),
        "rounds.0.slots.0.groupId",
      ),
    ).toBe("Pick a group for this round.");
  });

  it("rejects a later round left with 0 items to draw (dedup)", () => {
    // g1 has 2 items; two rounds each draw 2 → round 2 has nothing left.
    expect(
      isValid(
        makeValues({
          rounds: [
            { id: "r1", slots: [{ groupId: "g1", mode: "random", count: 2 }] },
            { id: "r2", slots: [{ groupId: "g1", mode: "random", count: 2 }] },
          ],
        }),
      ),
    ).toBe(false);
  });

  it("rejects an empty round list", () => {
    expect(messageAt(makeValues({ rounds: [] }), "rounds")).toBe(
      "Add at least one round.",
    );
  });
});

describe("createPackSchema — versus (nxn / 1v1)", () => {
  it("accepts a valid nxn pack", () => {
    expect(isValid(versusValues())).toBe(true);
  });

  it("accepts a valid 1v1 pack", () => {
    expect(isValid(versusValues({ format: "1v1" }))).toBe(true);
  });

  it("rejects a versus round without exactly two slots", () => {
    expect(
      messageAt(
        versusValues({
          rounds: [
            {
              id: "r1",
              slots: [{ groupId: "boys", mode: "random", count: 1 }],
            },
          ],
        }),
        "rounds.0.slots",
      ),
    ).toBe("Versus rounds need exactly two groups.");
  });

  it("accepts a single-pool versus round (the same pool on both sides)", () => {
    // 'boys' has 2 items; one 1-per-side round draws both (disjoint sides).
    expect(
      isValid(
        versusValues({
          rounds: [
            {
              id: "r1",
              slots: [
                { groupId: "boys", mode: "random", count: 1 },
                { groupId: "boys", mode: "random", count: 1 },
              ],
            },
          ],
        }),
      ),
    ).toBe(true);
  });

  it("rejects a single-pool round beyond the pool's capacity (0-draw)", () => {
    // 'boys' has 2 items; round 1 consumes both, so a second single-pool round
    // has nothing left to draw — the zero-draw feasibility check rejects it.
    expect(
      isValid(
        versusValues({
          rounds: [
            {
              id: "r1",
              slots: [
                { groupId: "boys", mode: "random", count: 1 },
                { groupId: "boys", mode: "random", count: 1 },
              ],
            },
            {
              id: "r2",
              slots: [
                { groupId: "boys", mode: "random", count: 1 },
                { groupId: "boys", mode: "random", count: 1 },
              ],
            },
          ],
        }),
      ),
    ).toBe(false);
  });

  it("accepts an nxn per-side count of exactly the max", () => {
    expect(
      isValid(
        versusValues({
          groups: [
            {
              id: "boys",
              name: "Boys",
              items: Array.from({ length: NXN_SIDE_COUNT_MAX }, (_, i) =>
                textItem(`b${i}`),
              ),
            },
            {
              id: "girls",
              name: "Girls",
              items: Array.from({ length: NXN_SIDE_COUNT_MAX }, (_, i) =>
                textItem(`g${i}`),
              ),
            },
          ],
          rounds: [
            {
              id: "r1",
              slots: [
                { groupId: "boys", mode: "random", count: NXN_SIDE_COUNT_MAX },
                { groupId: "girls", mode: "random", count: NXN_SIDE_COUNT_MAX },
              ],
            },
          ],
        }),
      ),
    ).toBe(true);
  });

  it("rejects an nxn per-side count above the max", () => {
    expect(
      messageAt(
        versusValues({
          groups: [
            {
              id: "boys",
              name: "Boys",
              items: Array.from({ length: 8 }, (_, i) => textItem(`b${i}`)),
            },
            {
              id: "girls",
              name: "Girls",
              items: Array.from({ length: 8 }, (_, i) => textItem(`g${i}`)),
            },
          ],
          rounds: [
            {
              id: "r1",
              slots: [
                {
                  groupId: "boys",
                  mode: "random",
                  count: NXN_SIDE_COUNT_MAX + 1,
                },
                {
                  groupId: "girls",
                  mode: "random",
                  count: NXN_SIDE_COUNT_MAX + 1,
                },
              ],
            },
          ],
        }),
        "rounds.0.slots.0.count",
      ),
    ).toBe(`Show 1–${NXN_SIDE_COUNT_MAX} items per side.`);
  });

  it("rejects a 1v1 per-side count other than 1", () => {
    expect(
      messageAt(
        versusValues({
          format: "1v1",
          rounds: [
            {
              id: "r1",
              slots: [
                { groupId: "boys", mode: "random", count: 2 },
                { groupId: "girls", mode: "random", count: 2 },
              ],
            },
          ],
        }),
        "rounds.0.slots.0.count",
      ),
    ).toBe("1v1 shows exactly one item per side.");
  });

  it("accepts rounds that vary the pair (each round is its own matchup)", () => {
    // Varied matchups: round 2 may use a different pair/order than round 1.
    expect(
      isValid(
        versusValues({
          rounds: [
            {
              id: "r1",
              slots: [
                { groupId: "boys", mode: "random", count: 1 },
                { groupId: "girls", mode: "random", count: 1 },
              ],
            },
            {
              id: "r2",
              slots: [
                { groupId: "girls", mode: "random", count: 1 },
                { groupId: "boys", mode: "random", count: 1 },
              ],
            },
          ],
        }),
      ),
    ).toBe(true);
  });
});

// #355: a slot can ask for a pool instead of naming one. A random pool is
// CONSUMED once drawn and a pinned pool is never drawn, so a pack can only
// afford as many random slots as it has pools left over after pinning.
describe("random pool capacity", () => {
  const pool = (id: string) => ({
    id,
    name: id,
    items: [
      { id: `${id}-a`, type: "text" as const, title: "A", value: "A" },
      { id: `${id}-b`, type: "text" as const, title: "B", value: "B" },
    ],
  });
  const nxnDraft = (
    rounds: Array<Array<Record<string, unknown>>>,
    poolCount = 3,
  ) => ({
    title: "Bands",
    description: "Band vs band, drawn fresh every play.",
    coverTone: "#2b2a3a",
    language: "en" as const,
    format: "nxn" as const,
    tags: ["Music" as const],
    groups: Array.from({ length: poolCount }, (_, i) => pool(`p${i + 1}`)),
    rounds: rounds.map((slots, ri) => ({
      id: `r${ri}`,
      slots: slots.map((slot) => ({ mode: "random", count: 1, ...slot })),
    })),
  });
  const messages = (result: { error?: { issues: { message: string }[] } }) =>
    (result.error?.issues ?? []).map((issue) => issue.message);

  it("rejects more random slots than there are unpinned pools", () => {
    const result = createPackSchema.safeParse(
      nxnDraft([
        [{ groupId: "p1" }, { groupId: "p2" }],
        [{ groupMode: "random" }, { groupMode: "random" }],
      ]),
    );
    expect(result.success).toBe(false);
    expect(messages(result)).toContain(
      "This pack needs 2 random pools but only 1 is available.",
    );
  });

  // The boundary: 4 pools, one pinned, three random — 3 <= 4 - 1.
  it("accepts exactly as many random slots as available pools", () => {
    const result = createPackSchema.safeParse(
      nxnDraft(
        [
          [{ groupMode: "random" }, { groupMode: "random" }],
          [{ groupMode: "random" }, { groupId: "p1" }],
        ],
        4,
      ),
    );
    expect(messages(result)).toEqual([]);
    expect(result.success).toBe(true);
  });

  it("does not ask a random slot to pick a group", () => {
    const result = createPackSchema.safeParse(
      nxnDraft([[{ groupMode: "random" }, { groupId: "p1" }]]),
    );
    expect(messages(result)).not.toContain("Pick a group for this round.");
  });
});

// UI-EXCLUDED:save_one_friends (velanto-frontend#368). Without this, deleting
// `.exclude(["save_one_friends"])` from create-pack.schema.ts leaves the whole
// suite green — the rule would not be tested at all. When the creator gains a
// room-based body, THIS test is the one to delete, deliberately.
describe("format", () => {
  it.each(["save_one", "sacrifice_one", "nxn", "rank_blind", "1v1"] as const)(
    "accepts the shipped format %s",
    (format) => {
      // rank_blind/1v1 have their own round shapes; only the format field is
      // under test here, so assert no issue names `format`.
      const result = createPackSchema.safeParse(makeValues({ format }));
      const paths = (result.error?.issues ?? []).map((issue) =>
        issue.path.join("."),
      );
      expect(paths).not.toContain("format");
    },
  );

  it("rejects save_one_friends, which the creator has no body for", () => {
    const result = createPackSchema.safeParse(
      makeValues({
        format: "save_one_friends",
      } as unknown as Partial<CreatePackValues>),
    );

    expect(result.success).toBe(false);
    expect(
      (result.error?.issues ?? []).map((issue) => issue.path.join(".")),
    ).toContain("format");
  });
});
