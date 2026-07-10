import { describe, it, expect } from "vitest";
import {
  createPackSchema,
  type CreatePackValues,
  TITLE_MAX,
  DESCRIPTION_MAX,
  MAX_VERSUS_ROUNDS,
  MAX_VERSUS_N,
} from "./create-pack.schema";
import type { Item } from "@/src/shared/types/pack";

function textItem(title: string): Item {
  return { id: `i-${title}`, type: "text", title, value: title };
}

function makeGroup(
  overrides: Partial<CreatePackValues["groups"][number]> = {},
): CreatePackValues["groups"][number] {
  return {
    id: "g1",
    name: "Round 1",
    selectionMode: "manual",
    items: [textItem("a")],
    ...overrides,
  };
}

function makeCategory(
  overrides: Partial<CreatePackValues["categories"][number]> = {},
): CreatePackValues["categories"][number] {
  return { id: "c1", name: "Boys", items: [textItem("Naruto")], ...overrides };
}

// A base draft valid for the group formats. Categories default to the two empty
// factory categories the form carries but never sends for group formats.
function makeValues(
  overrides: Partial<CreatePackValues> = {},
): CreatePackValues {
  return {
    title: "My pack",
    description: "A short description.",
    coverTone: "#2b2a3a",
    format: "save_one",
    tags: [],
    groups: [makeGroup()],
    categories: [
      { id: "c1", name: "", items: [] },
      { id: "c2", name: "", items: [] },
    ],
    versusRounds: undefined,
    versusN: undefined,
    ...overrides,
  };
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

  it("rejects a blank title with the original message", () => {
    expect(messageAt(makeValues({ title: "   " }), "title")).toBe(
      "Give your pack a title.",
    );
  });

  it("rejects an over-long title", () => {
    expect(
      messageAt(makeValues({ title: "a".repeat(TITLE_MAX + 1) }), "title"),
    ).toBe(`Title must be ${TITLE_MAX} characters or fewer.`);
  });

  it("rejects a blank description with the original message", () => {
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

describe("createPackSchema — save_one / sacrifice_one / rank_blind (group formats)", () => {
  for (const format of ["save_one", "sacrifice_one", "rank_blind"] as const) {
    it(`accepts a valid ${format} pack`, () => {
      expect(isValid(makeValues({ format }))).toBe(true);
    });
  }

  it("rejects a group with no name", () => {
    expect(
      messageAt(
        makeValues({ groups: [makeGroup({ name: " " })] }),
        "groups.0.name",
      ),
    ).toBe("Every group needs a name.");
  });

  it("rejects a group with no items", () => {
    expect(
      messageAt(
        makeValues({ groups: [makeGroup({ name: "R1", items: [] })] }),
        "groups.0.items",
      ),
    ).toBe('Group "R1" needs at least one item.');
  });

  it("rejects a random group with no sample size", () => {
    expect(
      messageAt(
        makeValues({
          groups: [
            makeGroup({
              name: "R1",
              selectionMode: "random",
              sampleSize: undefined,
            }),
          ],
        }),
        "groups.0.sampleSize",
      ),
    ).toBe('Group "R1" needs a sample size.');
  });

  it("rejects a random group whose sample size exceeds its item count", () => {
    expect(
      messageAt(
        makeValues({
          groups: [
            makeGroup({
              name: "R1",
              selectionMode: "random",
              sampleSize: 5,
              items: [textItem("a")],
            }),
          ],
        }),
        "groups.0.sampleSize",
      ),
    ).toBe("Group \"R1\"'s sample size can't exceed its 1 item(s).");
  });

  it("accepts a random group whose sample size equals its item count (boundary)", () => {
    expect(
      isValid(
        makeValues({
          groups: [
            makeGroup({
              selectionMode: "random",
              sampleSize: 2,
              items: [textItem("a"), textItem("b")],
            }),
          ],
        }),
      ),
    ).toBe(true);
  });

  it("ignores categories/versus fields for group formats", () => {
    // Empty default categories + unset versus must not fail a group format.
    expect(isValid(makeValues({ format: "sacrifice_one" }))).toBe(true);
  });
});

describe("createPackSchema — nxn", () => {
  function nxnValues(
    overrides: Partial<CreatePackValues> = {},
  ): CreatePackValues {
    return makeValues({
      format: "nxn",
      groups: [],
      categories: [
        makeCategory({ id: "c1", name: "Boys" }),
        makeCategory({ id: "c2", name: "Girls" }),
      ],
      versusRounds: 8,
      versusN: 1,
      ...overrides,
    });
  }

  it("accepts a valid nxn pack", () => {
    expect(isValid(nxnValues())).toBe(true);
  });

  it("rejects a category count other than 2", () => {
    expect(
      messageAt(
        nxnValues({
          categories: [makeCategory(), makeCategory(), makeCategory()],
        }),
        "categories",
      ),
    ).toBe("NxN packs need exactly 2 categories.");
  });

  it("rejects a nameless category", () => {
    expect(
      messageAt(
        nxnValues({
          categories: [
            makeCategory({ name: " " }),
            makeCategory({ id: "c2", name: "Girls" }),
          ],
        }),
        "categories.0.name",
      ),
    ).toBe("Every category needs a name.");
  });

  it("rejects a category with no items", () => {
    expect(
      messageAt(
        nxnValues({
          categories: [
            makeCategory({ name: "Boys", items: [] }),
            makeCategory({ id: "c2", name: "Girls" }),
          ],
        }),
        "categories.0.items",
      ),
    ).toBe('Category "Boys" needs at least one item.');
  });

  it("requires versusRounds", () => {
    expect(
      messageAt(nxnValues({ versusRounds: undefined }), "versusRounds"),
    ).toBe("Set how many rounds to play.");
  });

  it("rejects versusRounds above the max (boundary)", () => {
    expect(
      messageAt(
        nxnValues({ versusRounds: MAX_VERSUS_ROUNDS + 1 }),
        "versusRounds",
      ),
    ).toBe(`Rounds can't exceed ${MAX_VERSUS_ROUNDS}.`);
  });

  it("accepts versusRounds at the max (boundary)", () => {
    expect(isValid(nxnValues({ versusRounds: MAX_VERSUS_ROUNDS }))).toBe(true);
  });

  it("requires versusN", () => {
    expect(messageAt(nxnValues({ versusN: undefined }), "versusN")).toBe(
      "Set how many items to show per side.",
    );
  });

  it("rejects versusN above the max (boundary)", () => {
    expect(
      messageAt(
        nxnValues({
          versusN: MAX_VERSUS_N + 1,
          categories: [
            makeCategory({
              id: "c1",
              name: "Boys",
              items: Array.from({ length: 10 }, (_, i) => textItem(`b${i}`)),
            }),
            makeCategory({
              id: "c2",
              name: "Girls",
              items: Array.from({ length: 10 }, (_, i) => textItem(`g${i}`)),
            }),
          ],
        }),
        "versusN",
      ),
    ).toBe(`Items per round can't exceed ${MAX_VERSUS_N}.`);
  });

  it("rejects a category with fewer items than versusN", () => {
    expect(
      messageAt(
        nxnValues({
          versusN: 5,
          categories: [
            makeCategory({ id: "c1", name: "Boys" }),
            makeCategory({ id: "c2", name: "Girls" }),
          ],
        }),
        "categories.0.items",
      ),
    ).toBe('Category "Boys" needs at least 5 item(s).');
  });

  it("accepts categories with exactly versusN items (boundary)", () => {
    expect(
      isValid(
        nxnValues({
          versusN: 2,
          categories: [
            makeCategory({
              id: "c1",
              name: "Boys",
              items: [textItem("a"), textItem("b")],
            }),
            makeCategory({
              id: "c2",
              name: "Girls",
              items: [textItem("c"), textItem("d")],
            }),
          ],
        }),
      ),
    ).toBe(true);
  });
});

describe("createPackSchema — 1v1 (head to head)", () => {
  function h2hValues(
    overrides: Partial<CreatePackValues> = {},
  ): CreatePackValues {
    return makeValues({
      format: "1v1",
      groups: [
        makeGroup({
          name: "Round 1",
          items: [textItem("Goku"), textItem("Vegeta")],
        }),
      ],
      ...overrides,
    });
  }

  it("accepts a valid 1v1 pack with exactly 2 manual items (boundary)", () => {
    expect(isValid(h2hValues())).toBe(true);
  });

  it("rejects a 1v1 group with only 1 item", () => {
    expect(
      messageAt(
        h2hValues({
          groups: [makeGroup({ name: "Round 1", items: [textItem("Goku")] })],
        }),
        "groups.0",
      ),
    ).toBe('Group "Round 1" needs exactly 2 items for a 1v1 matchup.');
  });

  it("rejects a 1v1 group with 3 items", () => {
    expect(
      messageAt(
        h2hValues({
          groups: [
            makeGroup({
              name: "Round 1",
              items: [textItem("a"), textItem("b"), textItem("c")],
            }),
          ],
        }),
        "groups.0",
      ),
    ).toBe('Group "Round 1" needs exactly 2 items for a 1v1 matchup.');
  });

  it("rejects a random-mode 1v1 group whose sampleSize is not 2", () => {
    expect(
      messageAt(
        h2hValues({
          groups: [
            makeGroup({
              name: "Round 1",
              selectionMode: "random",
              sampleSize: 3,
              items: [textItem("a"), textItem("b"), textItem("c")],
            }),
          ],
        }),
        "groups.0",
      ),
    ).toBe(
      'Group "Round 1" needs a sample size of exactly 2 for a 1v1 matchup.',
    );
  });

  it("accepts a random-mode 1v1 group with sampleSize 2 and >=2 items", () => {
    expect(
      isValid(
        h2hValues({
          groups: [
            makeGroup({
              name: "Round 1",
              selectionMode: "random",
              sampleSize: 2,
              items: [textItem("a"), textItem("b"), textItem("c")],
            }),
          ],
        }),
      ),
    ).toBe(true);
  });

  it("rejects a random-mode 1v1 group whose sampleSize is 2 but has only 1 item (backend parity)", () => {
    // roundSize === 2 passes the head-to-head check, but the backend groupSchema
    // still rejects sampleSize > items.length — the old validate() let this
    // through.
    expect(
      messageAt(
        h2hValues({
          groups: [
            makeGroup({
              name: "Round 1",
              selectionMode: "random",
              sampleSize: 2,
              items: [textItem("a")],
            }),
          ],
        }),
        "groups.0.sampleSize",
      ),
    ).toBe("Group \"Round 1\"'s sample size can't exceed its 1 item(s).");
  });

  it("rejects an empty group list", () => {
    expect(messageAt(h2hValues({ groups: [] }), "groups")).toBe(
      "Add at least one group.",
    );
  });
});
