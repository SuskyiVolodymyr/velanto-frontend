import { describe, expect, it } from "vitest";
import { resolveRoundCandidates, resolveVersusRoundCandidates } from "./round-sampling";
import type { Category, Group } from "@/src/shared/types/pack";

function textItem(id: string, title: string) {
  return { id, type: "text" as const, title, value: title };
}

describe("resolveRoundCandidates", () => {
  it("returns all items in authored order for manual selection", () => {
    const group: Group = {
      id: "g1",
      name: "Round 1",
      selectionMode: "manual",
      items: [textItem("1", "A"), textItem("2", "B"), textItem("3", "C")],
    };

    expect(resolveRoundCandidates(group)).toEqual(group.items);
  });

  it("ignores sampleSize for manual selection even if set", () => {
    const group: Group = {
      id: "g1",
      name: "Round 1",
      selectionMode: "manual",
      sampleSize: 1,
      items: [textItem("1", "A"), textItem("2", "B")],
    };

    expect(resolveRoundCandidates(group)).toHaveLength(2);
  });

  it("samples exactly sampleSize unique items from the group for random selection", () => {
    const items = [textItem("1", "A"), textItem("2", "B"), textItem("3", "C"), textItem("4", "D")];
    const group: Group = { id: "g1", name: "Round 1", selectionMode: "random", sampleSize: 2, items };

    const result = resolveRoundCandidates(group);

    expect(result).toHaveLength(2);
    const ids = result.map((item) => item.id);
    expect(new Set(ids).size).toBe(2);
    for (const item of result) {
      expect(items).toContainEqual(item);
    }
  });

  it("falls back to all items when sampleSize is missing for random selection", () => {
    const items = [textItem("1", "A"), textItem("2", "B")];
    const group: Group = { id: "g1", name: "Round 1", selectionMode: "random", items };

    expect(resolveRoundCandidates(group)).toHaveLength(2);
  });

  it("re-samples randomly rather than always returning the same order", () => {
    const items = Array.from({ length: 20 }, (_, i) => textItem(String(i), `Item ${i}`));
    const group: Group = { id: "g1", name: "Round 1", selectionMode: "random", sampleSize: 20, items };

    const first = resolveRoundCandidates(group).map((item) => item.id);
    const second = resolveRoundCandidates(group).map((item) => item.id);

    expect(first).not.toEqual(second);
  });
});

describe("resolveVersusRoundCandidates", () => {
  it("samples exactly versusN unique items from the category", () => {
    const items = [textItem("1", "A"), textItem("2", "B"), textItem("3", "C"), textItem("4", "D")];
    const category: Category = { id: "ca", name: "Boys", items };

    const result = resolveVersusRoundCandidates(category, 2);

    expect(result).toHaveLength(2);
    const ids = result.map((item) => item.id);
    expect(new Set(ids).size).toBe(2);
    for (const item of result) {
      expect(items).toContainEqual(item);
    }
  });

  it("returns all items when versusN equals the category's item count", () => {
    const items = [textItem("1", "A"), textItem("2", "B")];
    const category: Category = { id: "ca", name: "Boys", items };

    expect(resolveVersusRoundCandidates(category, 2)).toHaveLength(2);
  });

  it("re-samples randomly across calls", () => {
    const items = Array.from({ length: 20 }, (_, i) => textItem(String(i), `Item ${i}`));
    const category: Category = { id: "ca", name: "Boys", items };

    const first = resolveVersusRoundCandidates(category, 20).map((item) => item.id);
    const second = resolveVersusRoundCandidates(category, 20).map((item) => item.id);

    expect(first).not.toEqual(second);
  });
});
