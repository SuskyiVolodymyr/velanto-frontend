import { describe, expect, it } from "vitest";
import { FORMAT_FILTER_VALUES } from "./filter-options";
import { PACK_FORMATS } from "@/src/shared/types/pack";

describe("FORMAT_FILTER_VALUES", () => {
  it("starts with the 'all' sentinel", () => {
    expect(FORMAT_FILTER_VALUES[0]).toBe("all");
  });

  // The site that was forgotten for rank_blind and nearly for 1v1 (see
  // docs/superpowers/specs/2026-07-07-1v1-frontend-design.md). Deriving the row
  // from PACK_FORMATS is what makes drift impossible; this pins the derivation
  // so nobody "simplifies" it back to a hand-written literal.
  it("offers every format, in PACK_FORMATS order, so the row cannot drift", () => {
    expect(FORMAT_FILTER_VALUES).toEqual([
      "all",
      "save_one",
      "sacrifice_one",
      "nxn",
      "rank_blind",
      "1v1",
      "save_one_friends",
    ]);
  });

  // save_one_friends is filterable: its cards lead to a detail page with a room
  // entry, so a chip is no dead end. Derived from PACK_FORMATS, so it can't drift.
  it("includes save_one_friends", () => {
    expect(FORMAT_FILTER_VALUES).toContain("save_one_friends");
    expect(PACK_FORMATS).toContain("save_one_friends");
  });
});
