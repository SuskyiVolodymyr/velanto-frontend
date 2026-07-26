import { describe, expect, it } from "vitest";
import { FORMAT_FILTER_VALUES } from "./filter-options";

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
    ]);
  });
});
