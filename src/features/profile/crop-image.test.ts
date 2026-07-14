import { describe, expect, it } from "vitest";
import { computeCrop, MAX_AVATAR_CROP } from "./crop-image";

describe("computeCrop", () => {
  it("keeps the crop area size when it is under the cap", () => {
    const plan = computeCrop({ x: 10, y: 20, width: 300, height: 300 });
    expect(plan.source).toEqual({ x: 10, y: 20, width: 300, height: 300 });
    expect(plan.size).toBe(300);
  });

  it("caps the output dimension at 512 for a large crop", () => {
    const plan = computeCrop({ x: 0, y: 0, width: 1024, height: 1024 });
    expect(plan.size).toBe(MAX_AVATAR_CROP);
    expect(MAX_AVATAR_CROP).toBe(512);
    // source region is untouched — we downscale on draw, not by shrinking the read.
    expect(plan.source.width).toBe(1024);
  });

  it("rounds fractional crop coordinates and dimensions to whole pixels", () => {
    const plan = computeCrop({ x: 0.4, y: 0.6, width: 255.5, height: 255.5 });
    expect(plan.source).toEqual({ x: 0, y: 1, width: 256, height: 256 });
    expect(plan.size).toBe(256);
  });
});
