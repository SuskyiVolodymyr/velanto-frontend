import { describe, it, expect } from "vitest";
import type { Pack } from "@/src/shared/types/pack";
import { HOT_PLAYS_THRESHOLD, isHotPack } from "./hot-pack";

function packWithPlays(totalPlays: number): Pack {
  return { totalPlays } as Pack;
}

describe("isHotPack", () => {
  it("is hot at or above the threshold", () => {
    expect(isHotPack(packWithPlays(HOT_PLAYS_THRESHOLD))).toBe(true);
    expect(isHotPack(packWithPlays(HOT_PLAYS_THRESHOLD + 500))).toBe(true);
  });

  it("is not hot below the threshold", () => {
    expect(isHotPack(packWithPlays(HOT_PLAYS_THRESHOLD - 1))).toBe(false);
    expect(isHotPack(packWithPlays(0))).toBe(false);
  });
});
