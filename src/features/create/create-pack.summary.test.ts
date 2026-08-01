import { describe, it, expect } from "vitest";
import { summarizePack } from "./create-pack.summary";
import type { CreatePackValues } from "./create-pack.schema";
import type { Item } from "@/src/shared/types/pack";

function textItem(title: string): Item {
  return { id: `i-${title}`, type: "text", title, value: title };
}

// A base elimination draft: one pool of 2 items, one round drawing both.
// Mirrors the fixture convention in create-pack.schema.test.ts so the two
// suites stay easy to compare.
function makeValues(overrides: Partial<CreatePackValues> = {}): CreatePackValues {
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

describe("summarizePack", () => {
  it("returns all-zero counts and canPublish false for an empty/default draft", () => {
    const values = makeValues({
      title: "",
      description: "",
      groups: [],
      rounds: [],
    });

    expect(summarizePack(values)).toEqual({
      elementCount: 0,
      poolCount: 0,
      roundCount: 0,
      canPublish: false,
    });
  });

  it("counts items and pools for a single pool with items", () => {
    const values = makeValues({
      groups: [
        {
          id: "g1",
          name: "Openings",
          items: [textItem("a"), textItem("b"), textItem("c")],
        },
      ],
    });

    const summary = summarizePack(values);
    expect(summary.elementCount).toBe(3);
    expect(summary.poolCount).toBe(1);
    expect(summary.roundCount).toBe(1);
  });

  it("counts rounds by rounds.length (not slots) for a versus-format draft", () => {
    const values = makeValues({
      format: "nxn",
      groups: [
        { id: "boys", name: "Boys", items: [textItem("Naruto"), textItem("Sasuke")] },
        { id: "girls", name: "Girls", items: [textItem("Sakura"), textItem("Hinata")] },
      ],
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
    });

    const summary = summarizePack(values);
    expect(summary.elementCount).toBe(4);
    expect(summary.poolCount).toBe(2);
    // Two 2-slot rounds → roundCount is 2 (rounds.length), never 4 (slot count).
    expect(summary.roundCount).toBe(2);
  });

  it("sums elements across multiple pools", () => {
    const values = makeValues({
      groups: [
        { id: "g1", name: "A", items: [textItem("a"), textItem("b")] },
        { id: "g2", name: "B", items: [textItem("c")] },
        { id: "g3", name: "C", items: [] },
      ],
    });

    const summary = summarizePack(values);
    expect(summary.elementCount).toBe(3);
    expect(summary.poolCount).toBe(3);
  });

  it("canPublish is false when description is empty even with a title", () => {
    const values = makeValues({ title: "My pack", description: "" });
    expect(summarizePack(values).canPublish).toBe(false);
  });

  it("canPublish is false when there are zero elements even with title and description", () => {
    const values = makeValues({
      title: "My pack",
      description: "A short description.",
      groups: [{ id: "g1", name: "Empty", items: [] }],
    });
    expect(summarizePack(values).canPublish).toBe(false);
  });

  it("canPublish is true when title, description, and at least one element are present", () => {
    const values = makeValues({
      title: "My pack",
      description: "A short description.",
      groups: [{ id: "g1", name: "Openings", items: [textItem("a")] }],
    });
    expect(summarizePack(values).canPublish).toBe(true);
  });

  it("canPublish is false when title and description are whitespace-only", () => {
    const values = makeValues({ title: "   ", description: "   " });
    expect(summarizePack(values).canPublish).toBe(false);
  });
});
