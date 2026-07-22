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
  it("offers every UI format, in PACK_FORMATS order, so the row cannot drift", () => {
    expect(FORMAT_FILTER_VALUES).toEqual([
      "all",
      "save_one",
      "sacrifice_one",
      "nxn",
      "rank_blind",
      "1v1",
    ]);
  });

  // UI-EXCLUDED:save_one_friends (velanto-frontend#368) — a chip for a format
  // whose packs 404 on /play would be a dead end for the whole feed row.
  it("omits save_one_friends, which has no play path", () => {
    expect(FORMAT_FILTER_VALUES).not.toContain("save_one_friends");
    // …and it really is in the wire union, so the omission is the rule working,
    // not the constant being stale.
    expect(PACK_FORMATS).toContain("save_one_friends");
  });
});
