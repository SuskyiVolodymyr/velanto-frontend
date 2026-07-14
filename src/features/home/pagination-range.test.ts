import { describe, expect, it } from "vitest";
import { buildPaginationRange } from "./pagination-range";

describe("buildPaginationRange", () => {
  it("lists every page without ellipsis when the count is small", () => {
    expect(buildPaginationRange(1, 3)).toEqual([1, 2, 3]);
    expect(buildPaginationRange(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("collapses the tail when the current page is near the start", () => {
    expect(buildPaginationRange(1, 20)).toEqual([1, 2, "ellipsis", 20]);
    expect(buildPaginationRange(2, 20)).toEqual([1, 2, 3, "ellipsis", 20]);
  });

  it("collapses the head when the current page is near the end", () => {
    expect(buildPaginationRange(20, 20)).toEqual([1, "ellipsis", 19, 20]);
    expect(buildPaginationRange(19, 20)).toEqual([1, "ellipsis", 18, 19, 20]);
  });

  it("collapses both sides around a middle page", () => {
    expect(buildPaginationRange(7, 20)).toEqual([
      1,
      "ellipsis",
      6,
      7,
      8,
      "ellipsis",
      20,
    ]);
  });

  it("never emits pages outside the 1..totalPages bounds", () => {
    const range = buildPaginationRange(1, 20);
    const numbers = range.filter((item): item is number => item !== "ellipsis");
    expect(Math.min(...numbers)).toBe(1);
    expect(Math.max(...numbers)).toBe(20);
  });
});
